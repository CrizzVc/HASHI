import './assets/main.css'
// El puente debe instalarse ANTES de que App (u otros módulos) usen `window.api`.
import './bridge/api'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
