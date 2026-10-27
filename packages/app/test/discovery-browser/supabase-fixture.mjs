// Local HTTP fixture ONLY. Real SQL/RLS/Auth verification belongs to LOC-34/35.
import { Buffer } from 'node:buffer'
import http from 'node:http'

const states = new Map()
http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  const token = req.headers.authorization?.slice(7)
  let id
  try {
    id = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub
  }
  catch {
    res.writeHead(401).end('{}')
    return
  }
  if (req.url === '/auth/v1/user') {
    res.end(JSON.stringify({ id, email: `${id}@example.test`, aud: 'authenticated', role: 'authenticated' }))
    return
  }
  const eligible = !id.includes('old')
  let state = states.get(id) ?? { eligible, status: eligible ? 'pending' : 'ineligible', source: null }
  if (req.url === '/rest/v1/rpc/save_discovery_source') {
    if (!eligible) {
      res.writeHead(403).end(JSON.stringify({ code: '42501' }))
      return
    }
    let raw = ''
    for await (const chunk of req) raw += chunk
    const body = JSON.parse(raw)
    if (state.status === 'pending') {
      state = { eligible, status: body.p_status, source: body.p_source }
      states.set(id, state)
    }
  }
  res.end(JSON.stringify(state))
}).listen(1055, '127.0.0.1', () => console.log('Supabase HTTP fixture :1055'))
