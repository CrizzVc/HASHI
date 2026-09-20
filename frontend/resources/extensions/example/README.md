# Extensión de Ejemplo para HASHI Launcher

Esta carpeta es una **plantilla de extensión externa** completamente autónoma para HASHI.

## 📁 Estructura del proyecto

```text
example/
├── manifest.json      # Configuración y metadatos para HASHI
├── README.md          # Esta guía
├── frontend/          # Vista web (HTML, CSS, JS)
│   ├── index.html     # Estructura de la interfaz
│   ├── style.css      # Estilos visuales
│   └── app.js         # Lógica del cliente y peticiones al backend
└── backend/           # Mini backend con Express
    ├── package.json   # Dependencias del servidor
    └── server.js      # Servidor Express y endpoints API
```

## 🚀 Cómo ponerla en marcha

1. **Instalar dependencias del backend:**
   ```bash
   cd backend
   npm install
   ```

2. **Iniciar el servidor backend:**
   ```bash
   npm start
   ```
   El servidor se iniciará en `http://localhost:3001` y servirá tanto los endpoints de API como la vista frontend.

3. **Ver la extensión en HASHI:**
   - Abre HASHI Launcher.
   - Ve a la sección o modal de **Extensiones**.
   - Haz clic en **Recargar**.
   - ¡Verás la extensión activa y podrás abrirla directamente desde el launcher o el sidebar!

## ⚙️ Configuración (`manifest.json`)

```json
{
  "id": "example",
  "name": "Extensión de Ejemplo",
  "description": "Plantilla de extensión externa con frontend (HTML/CSS/JS) y mini backend en Express.",
  "version": "1.0.0",
  "type": "external",
  "entryUrl": "http://localhost:3001",
  "sidebar": true,
  "enabled": true
}
```
