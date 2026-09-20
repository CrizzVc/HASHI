# Example Extension for HASHI Launcher

This folder is a fully autonomous **external extension template** for HASHI with **automatic backend lifecycle management**.

## 📁 Project Structure

```text
example/
├── manifest.json      # Configuration and metadata (includes "backendEntry")
├── README.md          # This guide
├── frontend/          # Web UI (HTML, CSS, JS)
│   ├── index.html     # HTML interface structure
│   ├── style.css      # Visual styles and design tokens
│   └── app.js         # Client logic and backend requests
└── backend/           # Mini backend for the extension
    ├── package.json   # Backend metadata
    └── server.js      # HTTP/API server & static file server
```

## 🚀 How automatic backend startup works in HASHI

1. **Seamless auto-start:**
   When HASHI detects `"backendEntry": "backend/server.js"` in `manifest.json`, the launcher **automatically starts the backend as a background subprocess**.
   * No need to open a terminal manually.
   * When closing HASHI or disabling the extension, HASHI terminates the subprocess cleanly.

2. **Zero required dependencies:**
   The `backend/server.js` file uses native standard Node.js modules (`http`, `fs`, `path`, `https`), so it runs immediately on any machine without needing `npm install`.

## ⚙️ Configuration (`manifest.json`)

```json
{
  "id": "example",
  "name": "Example Extension",
  "description": "External extension template with frontend (HTML/CSS/JS) and Express/Node mini backend.",
  "version": "1.0.0",
  "type": "external",
  "entryUrl": "http://localhost:3001",
  "backendEntry": "backend/server.js",
  "sidebar": true,
  "enabled": true
}
```

