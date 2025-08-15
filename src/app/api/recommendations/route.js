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

    // 4) Enhanced attribute fetching for current user
    // Fetch current user's role-specific attributes to compute similarity when graph is sparse
    let currentAttrs = { 
      industry: null, 
      stage: null, 
      location: null, 
      slug: null, 
      sectors: [], 
      investment_stages: [], 
      geographic_focus: [],
      expertise_tags: []
    }
    
    if (currentUserRole === 'startup') {
      const { data: s } = await supabase
        .from('startup_profiles')
        .select('industry, stage, location, slug, funding_stage')
        .eq('user_id', currentUserId)
        .maybeSingle()
      if (s) {
        currentAttrs = { 
          industry: s.industry, 
          stage: s.stage, 
          location: s.location, 
          slug: s.slug,
          funding_stage: s.funding_stage,
          sectors: s.industry ? [s.industry] : [],
          investment_stages: s.funding_stage ? [s.funding_stage] : [],
          geographic_focus: s.location ? [s.location] : [],
          expertise_tags: []
        }
      }
    } else if (currentUserRole === 'mentor') {
      const { data: m } = await supabase
        .from('mentor_profiles')
        .select('expertise_tags, years_experience, availability')
        .eq('user_id', currentUserId)
        .maybeSingle()
      
      // Also get location from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('location')
        .eq('id', currentUserId)
        .maybeSingle()
        
      if (m) {
        currentAttrs = { 
          industry: m.expertise_tags?.[0] || null, 
          stage: null, 
          location: profile?.location || null, 
          slug: null,
          sectors: m.expertise_tags || [],
          investment_stages: [],
          geographic_focus: profile?.location ? [profile.location] : [],
          expertise_tags: m.expertise_tags || []
        }
      }
    } else if (currentUserRole === 'investor') {
      const { data: i } = await supabase
        .from('investor_profiles')
        .select('sectors, investment_stage, geographic_focus')
        .eq('user_id', currentUserId)
        .maybeSingle()
        
      // Also get location from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('location')
        .eq('id', currentUserId)
        .maybeSingle()
        
      if (i) {
        currentAttrs = { 
          industry: i.sectors?.[0] || null, 
          stage: i.investment_stage?.[0] || null, 
          location: profile?.location || null, 
          slug: null,
          sectors: i.sectors || [],
          investment_stages: i.investment_stage || [],
          geographic_focus: i.geographic_focus || [],
          expertise_tags: []
        }
      }
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





    //Attribute -Based Matching 
    // Enhanced attribute-based recommendations - always run this for better results
    if (final.length < topK) {
      // Fetch candidate profiles by role with more comprehensive data
      const { data: candidates } = await supabase
        .from('profiles')
        .select('id, role, full_name, avatar_url, location')
        .in('role', targetRoles)
        .neq('id', currentUserId)
        .limit(300)

      const candidateIds = (candidates || []).map((c) => c.id)

      // Enhanced attribute fetching with better field mapping
      let attrRows = []
      
      // Startup profiles with comprehensive attributes
      if (targetRoles.includes('startup') && candidateIds.length) {
        const { data } = await supabase
          .from('startup_profiles')
          .select('user_id, industry, stage, location, slug, funding_stage, employee_count')
          .in('user_id', candidateIds)
        attrRows = [...attrRows, ...(data || []).map(d => ({
          ...d,
          profile_type: 'startup',
          sectors: d.industry ? [d.industry] : [],
          investment_stages: d.funding_stage ? [d.funding_stage] : []
        }))]
      }
      
      // Mentor profiles with expertise tags
      if (targetRoles.includes('mentor') && candidateIds.length) {
        const { data } = await supabase
          .from('mentor_profiles')
          .select('user_id, expertise_tags, years_experience, availability, company, job_title')
          .in('user_id', candidateIds)
        attrRows = [...attrRows, ...(data || []).map(d => ({
          ...d,
          profile_type: 'mentor',
          industry: d.expertise_tags?.[0] || null,
          sectors: d.expertise_tags || [],
          stage: null,
          slug: null
        }))]
      }
      
      // Investor profiles with investment preferences
      if (targetRoles.includes('investor') && candidateIds.length) {
        const { data } = await supabase
          .from('investor_profiles')
          .select('user_id, sectors, investment_stage, geographic_focus, fund_name, ticket_size_min, ticket_size_max')
          .in('user_id', candidateIds)
        attrRows = [...attrRows, ...(data || []).map(d => ({
          ...d,
          profile_type: 'investor',
          industry: d.sectors?.[0] || null,
          stage: d.investment_stage?.[0] || null,
          slug: null,
          investment_stages: d.investment_stage || [],
          location: d.geographic_focus?.[0] || null
        }))]
      }

      const attrsByUser = new Map(attrRows.map((r) => [r.user_id, r]))
      const candidatesByUser = new Map((candidates || []).map((c) => [c.id, c]))

      const seen = new Set(final.map((x) => x.id))
      const scored = []
      
      for (const c of candidates || []) {
        if (seen.has(c.id)) continue
        const a = attrsByUser.get(c.id) || {}
        let score = 0
        const reasons = []
        
        // Enhanced matching logic based on user role
        if (currentUserRole === 'startup') {
          // For startups, recommend mentors and investors
          if (c.role === 'mentor') {
            // Match by industry expertise
            if (currentAttrs.industry && a.sectors?.includes(currentAttrs.industry)) {
              score += 4; reasons.push(`Expertise in ${currentAttrs.industry}`)
            }
            // Match by location
            if (currentAttrs.location && (a.location === currentAttrs.location || c.location === currentAttrs.location)) {
              score += 2; reasons.push(`Same location: ${currentAttrs.location}`)
            }
            // Available mentors get priority
            if (a.availability === 'available') {
              score += 1; reasons.push('Currently available')
            }
            // Experience bonus
            if (a.years_experience >= 10) {
              score += 1; reasons.push('Highly experienced')
            }
          } else if (c.role === 'investor') {
            // Match by investment stage
            if (currentAttrs.stage && a.investment_stages?.includes(currentAttrs.stage)) {
              score += 4; reasons.push(`Invests in ${currentAttrs.stage} stage`)
            }
            // Match by industry/sector
            if (currentAttrs.industry && a.sectors?.includes(currentAttrs.industry)) {
              score += 3; reasons.push(`Invests in ${currentAttrs.industry}`)
            }
            // Geographic focus
            if (currentAttrs.location && a.geographic_focus?.includes(currentAttrs.location)) {
              score += 2; reasons.push(`Focuses on ${currentAttrs.location} region`)
            }
          }
        } else if (currentUserRole === 'mentor') {
          // For mentors, recommend startups
          if (c.role === 'startup') {
            // Match by industry expertise
            if (currentAttrs.industry && a.industry === currentAttrs.industry) {
              score += 4; reasons.push(`Same industry: ${a.industry}`)
            }
            // Match by location
            if (currentAttrs.location && a.location === currentAttrs.location) {
              score += 2; reasons.push(`Same location: ${a.location}`)
            }
            // Stage preference (early stage gets priority)
            if (a.stage && ['idea', 'mvp', 'early_revenue'].includes(a.stage)) {
              score += 1; reasons.push('Early stage startup')
            }
          }
        } else if (currentUserRole === 'investor') {
          // For investors, recommend startups
          if (c.role === 'startup') {
            // Match by investment stage preference
            if (currentAttrs.investment_stages?.includes(a.funding_stage)) {
              score += 4; reasons.push(`Matches investment stage: ${a.funding_stage}`)
            }
            // Match by sector
            if (currentAttrs.sectors?.includes(a.industry)) {
              score += 3; reasons.push(`Target sector: ${a.industry}`)
            }
            // Geographic focus
            if (currentAttrs.geographic_focus?.includes(a.location)) {
              score += 2; reasons.push(`Target region: ${a.location}`)
            }
          }
        }
        
        // General matching (applies to all)
        if (currentAttrs.industry && a.industry && currentAttrs.industry === a.industry) {
          score += 2; reasons.push(`Same industry: ${a.industry}`)
        }
        if (currentAttrs.location && a.location && currentAttrs.location === a.location) {
          score += 1.5; reasons.push(`Same location: ${a.location}`)
        }
        if (currentAttrs.slug && a.slug && slugPrefix(currentAttrs.slug) === slugPrefix(a.slug)) {
          score += 1; reasons.push('Similar company focus')
        }
        
        // Add some randomness for diversity if no strong matches
        if (score === 0 && Math.random() > 0.7) {
          score = 0.5; reasons.push('Suggested for you')
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

      // Sort by score and add to final results
      scored.sort((x, y) => y.score - x.score)
      for (const s of scored) {
        final.push({ 
          id: s.id, 
          full_name: s.full_name, 
          avatar_url: s.avatar_url, 
          role: s.role, 
          reasons: s.reasons 
        })
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


