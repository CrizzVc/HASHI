const express = require('express')
const cors = require('cors')
const https = require('https')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Servir el frontend de la extensión de forma estática
const frontendDir = path.join(__dirname, '..', 'frontend')
app.use(express.static(frontendDir))

const HASHI_API_URL = 'https://crizzvc.github.io/Hashi-API/api.json'

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Error en la red: HTTP ${res.statusCode}`))
        return
      }
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch {
          reject(new Error('Error parseando JSON de respuesta'))
        }
      })
    }).on('error', reject)
  })
}

// Endpoint de actualizaciones
app.get('/api/updates', async (_req, res) => {
  try {
    const data = await fetchJson(HASHI_API_URL)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Endpoint de salud / estado de la extensión
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    extension: 'example',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  })
})

// Cualquier otra ruta no capturada envía el index.html del frontend
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`[HASHI Example Extension] Backend corriendo en http://localhost:${PORT}`)
  console.log(`[HASHI Example Extension] Frontend servido en http://localhost:${PORT}`)
})
