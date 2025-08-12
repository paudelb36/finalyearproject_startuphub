import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/api/auth'

async function loadGraphModule() {
  const mod = await import('@/app/recommendation_engine/graphRecommendation.js')
  return mod.default || mod
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const topK = parseInt(searchParams.get('topK') || '8', 10)
    const forUserId = searchParams.get('userId') || null
    const explicitTargetRole = searchParams.get('targetRole') || null // optional hint

    let auth = null
    if (!forUserId) {
      // Only require auth when userId is not explicitly provided
      auth = await requireAuth()
      if (auth?.error) {
        return Response.json({ error: auth.error }, { status: auth.status || 401 })
      }
    }

    const currentUserId = forUserId || auth.user.id
    const currentUserRole = auth?.profile?.role || null

    // Relationship edges we will use to build the graph
    /** @type {Array<{sourceId:string,targetId:string,type:'mentorship_completed'|'event_participation'|'investment_interest',weight?:number}>} */
    const relationships = []

    // 1) Mentorship accepted → strong ties
    {
      const { data } = await supabase
        .from('mentorship_requests')
        .select('startup_id, mentor_id, status')
        .in('status', ['accepted'])

      data?.forEach((row) => {
        if (row.startup_id && row.mentor_id) {
          relationships.push({
            sourceId: row.startup_id,
            targetId: row.mentor_id,
            type: 'mentorship_completed',
          })
        }
      })
    }

    // 2) Investment interest (pending/accepted) → medium ties
    {
      const { data } = await supabase
        .from('investment_requests')
        .select('startup_id, investor_id, status')
        .in('status', ['pending', 'accepted'])

      data?.forEach((row) => {
        if (row.startup_id && row.investor_id) {
          relationships.push({
            sourceId: row.startup_id,
            targetId: row.investor_id,
            type: 'investment_interest',
          })
        }
      })
    }

    // 3) Event participation co-attendance with the current user → weak ties
    //    We only add edges from current user to co-attendees to keep graph small.
    let userEventIds = []
    {
      const { data: userRegs } = await supabase
        .from('event_registrations')
        .select('event_id')
        .eq('user_id', currentUserId)
        .eq('status', 'confirmed')

      userEventIds = (userRegs || []).map((r) => r.event_id)

      if (userEventIds.length > 0) {
        const { data: coRegs } = await supabase
          .from('event_registrations')
          .select('event_id, user_id')
          .in('event_id', userEventIds)
          .eq('status', 'confirmed')

        coRegs?.forEach((r) => {
          if (r.user_id && r.user_id !== currentUserId) {
            relationships.push({
              sourceId: currentUserId,
              targetId: r.user_id,
              type: 'event_participation',
            })
          }
        })
      }
    }

    // Build graph recommendations if possible
    const graphMod = await loadGraphModule()
    let rawIds = []
    try {
      const graph = graphMod.buildGraph(relationships)
      const embeddings = await graphMod.trainNode2Vec(graph)
      rawIds = graphMod.getRecommendations(currentUserId, Math.max(topK * 3, 12), embeddings)
    } catch {
      rawIds = []
    }

    // Fetch profiles for recommended IDs to filter by role and include display data
    const { data: recProfiles } = rawIds.length
      ? await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, role')
          .in('id', rawIds)
      : { data: [] }

    const idToProfile = new Map((recProfiles || []).map((p) => [p.id, p]))

    // Choose target roles based on current user role (unless explicitly requested)
    let targetRoles
    if (explicitTargetRole) {
      targetRoles = explicitTargetRole.split(',').map((r) => r.trim())
    } else if (currentUserRole === 'startup') {
      targetRoles = ['mentor', 'investor']
    } else {
      targetRoles = ['startup']
    }

    // Compute co-attended event counts for reasons
    let coAttendCounts = new Map()
    if (userEventIds.length && recProfiles?.length) {
      const candidateIds = recProfiles.map((p) => p.id)
      const { data: othersRegs } = await supabase
        .from('event_registrations')
        .select('user_id, event_id')
        .in('user_id', candidateIds)
        .in('event_id', userEventIds)
        .eq('status', 'confirmed')
      coAttendCounts = new Map()
      ;(othersRegs || []).forEach((r) => {
        coAttendCounts.set(r.user_id, (coAttendCounts.get(r.user_id) || 0) + 1)
      })
    }

    // 4) Attribute-based fallback re-ranking — boosts by shared industry/stage/location/slug prefix
    // Fetch current user's role-specific attributes to compute similarity when graph is sparse
    let currentAttrs = { industry: null, stage: null, location: null, slug: null }
    if (currentUserRole === 'startup') {
      const { data: s } = await supabase
        .from('startup_profiles')
        .select('industry, stage, location, slug')
        .eq('user_id', currentUserId)
        .maybeSingle()
      if (s) currentAttrs = { industry: s.industry, stage: s.stage, location: s.location, slug: s.slug }
    } else if (currentUserRole === 'mentor') {
      const { data: m } = await supabase
        .from('mentor_profiles')
        .select('industry_focus:industry, location')
        .eq('user_id', currentUserId)
        .maybeSingle()
      if (m) currentAttrs = { industry: m.industry_focus, stage: null, location: m.location, slug: null }
    } else if (currentUserRole === 'investor') {
      const { data: i } = await supabase
        .from('investor_profiles')
        .select('industry_focus:industry, location')
        .eq('user_id', currentUserId)
        .maybeSingle()
      if (i) currentAttrs = { industry: i.industry_focus, stage: null, location: i.location, slug: null }
    }

    const slugPrefix = (s) => (typeof s === 'string' ? s.split('-')[0] : null)

    // Order by original similarity, but if empty/small, augment with attribute-similar candidates
    const final = []
    for (const id of rawIds) {
      const p = idToProfile.get(id)
      if (!p) continue
      if (!targetRoles.includes(p.role)) continue

      const reasons = []
      const shared = coAttendCounts.get(id) || 0
      if (shared > 0) {
        reasons.push(`Attended ${shared} event(s) together`)
      }
      final.push({ id: p.id, full_name: p.full_name, avatar_url: p.avatar_url, role: p.role, reasons })
      if (final.length >= topK) break
    }

    // If not enough results, add attribute-similar candidates
    if (final.length < topK) {
      // Fetch candidate profiles by role
      const { data: candidates } = await supabase
        .from('profiles')
        .select('id, role, full_name, avatar_url')
        .in('role', targetRoles)
        .neq('id', currentUserId)
        .limit(200)

      const candidateIds = (candidates || []).map((c) => c.id)

      // Join role tables to get attributes
      let attrRows = []
      if (targetRoles.includes('startup') && candidateIds.length) {
        const { data } = await supabase
          .from('startup_profiles')
          .select('user_id, industry, stage, location, slug')
          .in('user_id', candidateIds)
        attrRows = [...attrRows, ...(data || [])]
      }
      if (targetRoles.includes('mentor') && candidateIds.length) {
        const { data } = await supabase
          .from('mentor_profiles')
          .select('user_id, industry:industry_focus, stage:null, location, slug:null')
          .in('user_id', candidateIds)
        attrRows = [...attrRows, ...(data || [])]
      }
      if (targetRoles.includes('investor') && candidateIds.length) {
        const { data } = await supabase
          .from('investor_profiles')
          .select('user_id, industry:industry_focus, stage:null, location, slug:null')
          .in('user_id', candidateIds)
        attrRows = [...attrRows, ...(data || [])]
      }

      const attrsByUser = new Map(attrRows.map((r) => [r.user_id, r]))

      const seen = new Set(final.map((x) => x.id))
      const scored = []
      for (const c of candidates || []) {
        if (seen.has(c.id)) continue
        const a = attrsByUser.get(c.id) || {}
        let score = 0
        const reasons = []
        if (currentAttrs.industry && a.industry && currentAttrs.industry === a.industry) {
          score += 3; reasons.push(`Same industry: ${a.industry}`)
        }
        if (currentAttrs.stage && a.stage && currentAttrs.stage === a.stage) {
          score += 2; reasons.push(`Same stage: ${a.stage}`)
        }
        if (currentAttrs.location && a.location && currentAttrs.location === a.location) {
          score += 1.5; reasons.push(`Same location: ${a.location}`)
        }
        if (currentAttrs.slug && a.slug && slugPrefix(currentAttrs.slug) === slugPrefix(a.slug)) {
          score += 1; reasons.push('Similar slug')
        }
        if (score > 0) {
          scored.push({
            id: c.id,
            full_name: c.full_name,
            avatar_url: c.avatar_url,
            role: c.role,
            score,
            reasons,
          })
        }
      }

      scored.sort((x, y) => y.score - x.score)
      for (const s of scored) {
        final.push({ id: s.id, full_name: s.full_name, avatar_url: s.avatar_url, role: s.role, reasons: s.reasons })
        if (final.length >= topK) break
      }
    }

    return Response.json({ data: final, count: final.length }, { status: 200 })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Recommendations API error:', error)
    // Helpful hint if dependency missing
    const hint = String(error?.message || '')
    const needsDeps = hint.includes('graphology-embedding')
    return Response.json(
      { error: 'Failed to compute recommendations', hint: needsDeps ? 'Install dependencies: npm i graphology graphology-embedding' : undefined },
      { status: 500 }
    )
  }
}


