import { getPlatformStats } from '@/lib/api/admin'

export async function GET() {
  try {
    console.log('Admin stats API called')
    
    const result = await getPlatformStats()
    
    console.log('Admin stats API result:', result)
    
    if (result.error) {
      return Response.json({ error: result.error }, { status: result.status || 500 })
    }
    
    return Response.json(result, { status: 200 })
  } catch (error) {
    console.error('Admin stats API error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}