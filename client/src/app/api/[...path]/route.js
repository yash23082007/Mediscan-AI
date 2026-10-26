const FORWARDED_REQUEST_HEADERS = [
  'authorization',
  'content-type',
  'cookie',
  'x-api-key',
  'x-request-id',
]

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function proxyRequest(request, { params }) {
  const { path = [] } = await params
  const apiOrigin = (process.env.API_ORIGIN || 'http://localhost:3001').replace(/\/+$/, '')
  const target = new URL(`/api/${path.map(encodeURIComponent).join('/')}`, apiOrigin)
  target.search = new URL(request.url).search

  const headers = new Headers()
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }

  try {
    const method = request.method.toUpperCase()
    const upstream = await fetch(target, {
      method,
      headers,
      body: ['GET', 'HEAD'].includes(method) ? undefined : await request.arrayBuffer(),
      redirect: 'manual',
      cache: 'no-store',
    })

    const responseHeaders = new Headers()
    for (const name of ['content-type', 'cache-control', 'etag', 'vary', 'x-request-id', 'connection', 'x-accel-buffering']) {
      const value = upstream.headers.get(name)
      if (value) responseHeaders.set(name, value)
    }
    const contentType = upstream.headers.get('content-type') || ''
    if (contentType.includes('text/event-stream')) {
      responseHeaders.set('cache-control', 'no-cache, no-transform')
      responseHeaders.set('connection', 'keep-alive')
      responseHeaders.set('x-accel-buffering', 'no')
    }
    const cookies = upstream.headers.getSetCookie?.() || []
    for (const cookie of cookies) responseHeaders.append('set-cookie', cookie)

    return new Response(['204', '304'].includes(String(upstream.status)) ? null : upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('API proxy request failed:', error.message)
    return Response.json({
      error: 'The application service is temporarily unavailable.',
      code: 'API_UNAVAILABLE',
    }, { status: 503 })
  }
}

export const GET = proxyRequest
export const HEAD = proxyRequest
export const POST = proxyRequest
export const PUT = proxyRequest
export const PATCH = proxyRequest
export const DELETE = proxyRequest
