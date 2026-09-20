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
    statusEl.querySelector('.status-text').textContent = 'Backend: Disconnected (Port 3001)'
  }
}

// Check for updates
btnCheckUpdates.addEventListener('click', async () => {
  btnCheckUpdates.disabled = true
  btnCheckUpdates.querySelector('.btn-label').textContent = 'Checking...'
  resultContainer.classList.remove('hidden')
  jsonOutput.textContent = 'Loading backend response...'

  try {
    const res = await fetch(`${API_BASE}/api/updates`)
    if (!res.ok) throw new Error(`HTTP Error ${res.status}: ${res.statusText}`)
    const data = await res.json()
    jsonOutput.textContent = JSON.stringify(data, null, 2)
  } catch (err) {
    jsonOutput.textContent = `Error: ${err.message}\nMake sure you ran 'npm start' in the backend/ folder`
  } finally {
    btnCheckUpdates.disabled = false
    btnCheckUpdates.querySelector('.btn-label').textContent = 'Check for updates'
  }
})

// Copy JSON response
btnCopyJson.addEventListener('click', () => {
  if (!jsonOutput.textContent) return
  navigator.clipboard.writeText(jsonOutput.textContent)
  btnCopyJson.textContent = 'Copied!'
  setTimeout(() => {
    btnCopyJson.textContent = 'Copy JSON'
  }, 2000)
})

// Initial health check
checkBackendHealth()
setInterval(checkBackendHealth, 5000)
