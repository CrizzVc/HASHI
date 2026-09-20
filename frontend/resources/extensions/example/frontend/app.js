// Extension Client Logic
const API_BASE = window.location.origin.includes('localhost')
  ? window.location.origin
  : 'http://localhost:3001'

const statusEl = document.getElementById('backendStatus')
const btnCheckUpdates = document.getElementById('btnCheckUpdates')
const resultContainer = document.getElementById('resultContainer')
const jsonOutput = document.getElementById('jsonOutput').querySelector('code')
const btnCopyJson = document.getElementById('btnCopyJson')

// Health check to verify backend connection
async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    statusEl.className = 'status-indicator online'
    statusEl.querySelector('.status-text').textContent = `Backend: Online (v${data.version})`
  } catch (_err) {
    statusEl.className = 'status-indicator offline'
    statusEl.querySelector('.status-text').textContent = 'Backend: Desconectado (Puerto 3001)'
  }
}

// Check for updates
btnCheckUpdates.addEventListener('click', async () => {
  btnCheckUpdates.disabled = true
  btnCheckUpdates.querySelector('.btn-label').textContent = 'Consultando...'
  resultContainer.classList.remove('hidden')
  jsonOutput.textContent = 'Cargando respuesta del backend...'

  try {
    const res = await fetch(`${API_BASE}/api/updates`)
    if (!res.ok) throw new Error(`Error HTTP ${res.status}: ${res.statusText}`)
    const data = await res.json()
    jsonOutput.textContent = JSON.stringify(data, null, 2)
  } catch (err) {
    jsonOutput.textContent = `Error: ${err.message}\nAsegúrate de haber ejecutado 'npm start' en la carpeta backend/`
  } finally {
    btnCheckUpdates.disabled = false
    btnCheckUpdates.querySelector('.btn-label').textContent = 'Buscar actualizaciones'
  }
})

// Copy JSON response
btnCopyJson.addEventListener('click', () => {
  if (!jsonOutput.textContent) return
  navigator.clipboard.writeText(jsonOutput.textContent)
  btnCopyJson.textContent = '¡Copiado!'
  setTimeout(() => {
    btnCopyJson.textContent = 'Copiar JSON'
  }, 2000)
})

// Initial health check
checkBackendHealth()
setInterval(checkBackendHealth, 5000)
