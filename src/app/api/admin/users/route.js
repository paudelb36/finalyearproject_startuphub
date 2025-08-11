import { getUsers } from '@/lib/api/admin'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    
    const filters = {
      page: parseInt(searchParams.get('page')) || 1,
      limit: parseInt(searchParams.get('limit')) || 50,
      role: searchParams.get('role') || undefined,
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || 'created_at',
      sortOrder: searchParams.get('sortOrder') || 'desc'
    }
    
    console.log('Admin users API called with filters:', filters)
    
    const result = await getUsers(filters)
    
    console.log('Admin users API result:', result)
    
    if (result.error) {
      return Response.json({ error: result.error }, { status: result.status || 500 })
    }
    
    return Response.json(result, { status: 200 })
  } catch (error) {
    console.error('Admin users API error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}