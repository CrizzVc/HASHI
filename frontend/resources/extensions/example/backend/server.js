const http = require('http')
const https = require('https')
const fs = require('fs')
const path = require('path')

const PORT = process.env.PORT || 3001
const frontendDir = path.join(__dirname, '..', 'frontend')
const HASHI_API_URL = 'https://crizzvc.github.io/Hashi-API/api.json'

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Network error: HTTP ${res.statusCode}`))
        return
      }
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch {
          reject(new Error('Failed to parse JSON response'))
        }
      })
    }).on('error', reject)
  })
}

// Standalone HTTP server (uses Node.js native modules)
const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const urlPath = req.url ? req.url.split('?')[0] : '/'

  // 1. Endpoint: /api/health
  if (urlPath === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'ok',
      extension: 'example',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }))
    return
  }

  // 2. Endpoint: /api/updates
  if (urlPath === '/api/updates') {
    try {
      const data = await fetchJson(HASHI_API_URL)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(data))
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: err.message }))
    }
    return
  }

  // 3. Serve static frontend files
  let relativePath = urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, '')
  let filePath = path.join(frontendDir, relativePath)

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(frontendDir, 'index.html')
  }

  const ext = path.extname(filePath).toLowerCase()
  const contentType = MIME_TYPES[ext] || 'application/octet-stream'

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('404 File Not Found')
      return
    }
    res.writeHead(200, { 'Content-Type': contentType })
    res.end(content)
  })
})

server.listen(PORT, () => {
  console.log(`[HASHI Example Extension] Server running on http://localhost:${PORT}`)
})
