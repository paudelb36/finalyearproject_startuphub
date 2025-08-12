/*
  Recommendation engine using Graphology + Node2Vec
  - Builds a weighted undirected graph of relationships between startups, mentors, and investors
  - Trains Node2Vec to obtain node embeddings
  - Produces top-K similar node recommendations using cosine similarity
*/

let Graph = null
try {
  const req = typeof require === 'function' ? require : (0, eval)('require')
  Graph = req('graphology')
} catch (e) {
  Graph = null
}

// Prefer graphology-embedding's Node2Vec. If not installed, we throw a helpful error at runtime.
let node2vecImpl = null
async function ensureNode2VecLoaded() {
  if (!node2vecImpl) {
    try {
      // Prefer requiring synchronously for Node.js compatibility
      // Fallback to dynamic import if require fails
      try {
        const req = typeof require === 'function' ? require : (0, eval)('require')
        node2vecImpl = req('graphology-embedding/node2vec')
      } catch {
        node2vecImpl = (await import('graphology-embedding/node2vec')).default
      }
    } catch (e) {
      // Keep null → we will fall back to a simple similarity-based embedding later
      node2vecImpl = null
    }
  }
}

/**
 * @typedef {'mentorship_completed'|'event_participation'|'investment_interest'} RelationshipKind
 */

/**
 * @typedef {Object} RelationshipData
 * @property {string} sourceId
 * @property {string} targetId
 * @property {RelationshipKind} type
 * @property {number=} weight
 */

/**
 * @typedef {Object<string, number[]>} EmbeddingsMap
 */

/**
 * Default weights per relationship kind.
 * These can be overridden per edge by supplying `weight` in RelationshipData.
 */
const DEFAULT_WEIGHTS = {
  mentorship_completed: 3.0,
  event_participation: 1.0,
  investment_interest: 2.0,
}

/** Internal helper: add or accumulate an undirected weighted edge. */
function upsertWeightedUndirectedEdge(graph, a, b, w) {
  if (a === b) return
  const key = graph.hasUndirectedEdge(a, b) ? graph.undirectedEdge(a, b) : null
  if (key) {
    const existing = graph.getEdgeAttribute(key, 'weight')
    graph.setEdgeAttribute(key, 'weight', (existing ?? 0) + w)
  } else {
    graph.addUndirectedEdgeWithKey(`${a}::${b}`, a, b, { weight: w })
  }
}

/**
 * Build a weighted undirected graph from relationships.
 * - Nodes are user IDs (startups, mentors, investors)
 * - Edge weights are accumulated when multiple relationships exist between the same pair
 */
/**
 * @param {RelationshipData[]} data
 * @returns {any} graphology Graph instance
 */
function buildGraph(data) {
  if (Graph) {
    const graph = new Graph({ type: 'undirected', multi: false, allowSelfLoops: false })
    for (const rel of data) {
      const { sourceId, targetId, type } = rel
      const weight = typeof rel.weight === 'number' ? rel.weight : DEFAULT_WEIGHTS[type]
      if (!graph.hasNode(sourceId)) graph.addNode(sourceId)
      if (!graph.hasNode(targetId)) graph.addNode(targetId)
      upsertWeightedUndirectedEdge(graph, sourceId, targetId, weight)
    }
    return graph
  }

  // Fallback: lightweight structure when graphology is not installed
  const adj = new Map() // nodeId -> Map(nodeId, weight)
  const nodes = new Set()
  const add = (a, b, w) => {
    if (a === b) return
    if (!adj.has(a)) adj.set(a, new Map())
    if (!adj.has(b)) adj.set(b, new Map())
    nodes.add(a); nodes.add(b)
    const m1 = adj.get(a)
    const m2 = adj.get(b)
    m1.set(b, (m1.get(b) || 0) + w)
    m2.set(a, (m2.get(a) || 0) + w)
  }
  for (const rel of data) {
    const { sourceId, targetId, type } = rel
    const weight = typeof rel.weight === 'number' ? rel.weight : DEFAULT_WEIGHTS[type]
    add(sourceId, targetId, weight)
  }
  return { __simple: true, nodes: Array.from(nodes), adj }
}

/**
 * Train Node2Vec on the supplied graph and return embeddings.
 * - Uses sensible defaults; tune as needed for quality/perf trade-offs.
 */
/**
 * @param {any} graph graphology Graph instance
 * @returns {Promise<EmbeddingsMap>}
 */
async function trainNode2Vec(graph) {
  await ensureNode2VecLoaded()

  // Fallback path: if either graphology graph or node2vec is not available,
  // produce simple neighbor-weight embeddings (bag-of-neighbors in a fixed order).
  if (!Graph || !node2vecImpl || graph?.__simple) {
    const embeddings = {}
    // Normalize to a simple structure
    const adj = graph?.__simple ? graph.adj : (() => {
      // Build adjacency from graphology graph
      const m = new Map()
      const nodes = graph.nodes()
      nodes.forEach((n) => { if (!m.has(n)) m.set(n, new Map()) })
      graph.forEachUndirectedEdge((edge, attrs, source, target) => {
        const w = attrs?.weight ?? 1
        m.get(source).set(target, (m.get(source).get(target) || 0) + w)
        m.get(target).set(source, (m.get(target).get(source) || 0) + w)
      })
      return m
    })()
    const nodeIds = graph?.__simple ? graph.nodes : graph.nodes()
    const order = Array.from(nodeIds).sort()
    const indexOf = new Map(order.map((id, i) => [id, i]))
    order.forEach((id) => {
      const vec = new Array(order.length).fill(0)
      const nbrs = adj.get(id) || new Map()
      nbrs.forEach((w, nid) => {
        const idx = indexOf.get(nid)
        if (idx != null) vec[idx] = w
      })
      embeddings[id] = vec
    })
    return embeddings
  }

  // graphology + node2vec path
  const embeddings = /** @type {EmbeddingsMap} */ ({})
  const options = {
    dimensions: 64,
    walkLength: 40,
    iterations: 20,
    walksPerNode: 10,
    p: 1.0,
    q: 1.0,
    weighted: true,
    weightAttribute: 'weight',
  }
  const result = node2vecImpl(graph, options)
  for (const node of Object.keys(result)) embeddings[node] = Array.from(result[node])
  return embeddings
}

/** Compute cosine similarity between two vectors. */
/**
 * @param {number[]} a
 * @param {number[]} b
 */
function cosineSimilarity(a, b) {
  let dot = 0
  let na = 0
  let nb = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) {
    const va = a[i]
    const vb = b[i]
    dot += va * vb
    na += va * va
    nb += vb * vb
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

/**
 * Return top-K recommendations (node IDs) for a given startup based on embedding similarity.
 * - Currently returns the most similar other nodes (mentors/investors) discovered in embeddings
 * - Callers can further filter by role using profile data if necessary
 */
/**
 * @param {string} startupId
 * @param {number} topK
 * @param {EmbeddingsMap} embeddings
 * @returns {string[]}
 */
function getRecommendations(startupId, topK, embeddings) {
  const source = embeddings[startupId]
  if (!source) return []

  const scored = []
  for (const [id, vec] of Object.entries(embeddings)) {
    if (id === startupId) continue
    const score = cosineSimilarity(source, vec)
    if (!Number.isFinite(score)) continue
    scored.push({ id, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, Math.max(0, topK)).map((s) => s.id)
}

// Example usage for quick local testing: `node recommendation_engine/graphRecommendation.js`
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  ;(async () => {
    /** @type {RelationshipData[]} */
    const sample = [
      // Mentorship completed (3.0 each — strong ties)
      { sourceId: 'startup_A', targetId: 'mentor_1', type: 'mentorship_completed' },
      { sourceId: 'startup_B', targetId: 'mentor_1', type: 'mentorship_completed' },
      { sourceId: 'startup_A', targetId: 'mentor_2', type: 'mentorship_completed' },

      // Event participation (1.0 — weaker ties)
      { sourceId: 'startup_A', targetId: 'investor_5', type: 'event_participation' },
      { sourceId: 'startup_B', targetId: 'investor_5', type: 'event_participation' },
      { sourceId: 'startup_C', targetId: 'mentor_2', type: 'event_participation' },

      // Investment interest (2.0 — medium ties)
      { sourceId: 'startup_A', targetId: 'investor_3', type: 'investment_interest' },
      { sourceId: 'startup_C', targetId: 'investor_3', type: 'investment_interest' },
    ]

    const g = buildGraph(sample)
    const emb = await trainNode2Vec(g)
    const recs = getRecommendations('startup_A', 5, emb)
    // eslint-disable-next-line no-console
    console.log('Recommendations for startup_A:', recs)
  })().catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e)
    process.exit(1)
  })
}

module.exports = { buildGraph, trainNode2Vec, getRecommendations }


