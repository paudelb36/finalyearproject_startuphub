import { supabase } from '@/lib/supabase'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const offset = (page - 1) * limit
    
    console.log('Admin events API called with page:', page, 'limit:', limit)
    
    const { data: events, error, count } = await supabase
      .from('events')
      .select(`
        *,
        organizer:profiles!organizer_id(
          id,
          full_name,
          email
        )
      `, { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Database error details:', error)
      return Response.json({ error: 'Failed to fetch events' }, { status: 500 })
    }
    
    console.log('Admin events API result:', { count, eventsLength: events?.length })
    
    return Response.json({
      data: {
        events: events || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      },
      status: 200
    })
  } catch (error) {
    console.error('Admin events API error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}