# Extensión de Ejemplo para HASHI Launcher

Esta carpeta es una **plantilla de extensión externa** completamente autónoma para HASHI con **auto-arranque de backend**.

## 📁 Estructura del proyecto

```text
example/
├── manifest.json      # Configuración y metadatos (incluye "backendEntry")
├── README.md          # Esta guía
├── frontend/          # Vista web (HTML, CSS, JS)
│   ├── index.html     # Estructura de la interfaz
│   ├── style.css      # Estilos visuales
│   └── app.js         # Lógica del cliente y peticiones al backend
└── backend/           # Mini backend de la extensión
    ├── package.json   # Metadatos del backend
    └── server.js      # Servidor HTTP/API y servidor de archivos estáticos
```

## 🚀 Cómo funciona el auto-arranque en HASHI

1. **Auto-inicio transparente:**
   Cuando HASHI detecta la propiedad `"backendEntry": "backend/server.js"` en el `manifest.json`, el launcher **inicia automáticamente el backend como un subproceso en segundo plano**.
   * No requiere abrir la terminal.
   * Al cerrar HASHI o desactivar la extensión en el catálogo, HASHI apaga el subproceso automáticamente.

2. **Sin dependencias obligatorias:**
   El archivo `backend/server.js` de ejemplo utiliza las librerías estándar integradas en Node.js (`http`, `fs`, `path`, `https`), por lo que funciona al instante en cualquier máquina sin necesidad de ejecutar `npm install`.

## ⚙️ Configuración (`manifest.json`)

```json
{
  "id": "example",
  "name": "Extensión de Ejemplo",
  "description": "Plantilla de extensión externa con frontend (HTML/CSS/JS) y mini backend en Node.",
  "version": "1.0.0",
  "type": "external",
  "entryUrl": "http://localhost:3001",
  "backendEntry": "backend/server.js",
  "sidebar": true,
  "enabled": true
}
```
