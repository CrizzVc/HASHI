# Extensiones de HASHI

HASHI detecta extensiones declarativas desde la carpeta que se abre con **Extensiones → Abrir carpeta de extensiones**. Cada extensión tiene su propia carpeta y un archivo `manifest.json`.

El launcher viene sin extensiones internas preinstaladas, pero incluye una **extensión de ejemplo** en los recursos de desarrollo (`resources/extensions/example`) para que sirva como base para crear nuevas extensiones.

```text
extensions/
  mi-extension/
    manifest.json
```

## Tipos de extensiones

### 1. Extensiones Externas (`external`)
Abre una URL web externa segura (HTTPS) en el navegador del sistema.

```json
{
  "id": "mi-extension",
  "name": "Mi extensión",
  "description": "Descripción que aparece en HASHI.",
  "version": "1.0.0",
  "type": "external",
  "entryUrl": "https://ejemplo.com",
  "sidebar": true
}
```

### 2. Extensiones Embebidas (`embedded`)
Permiten renderizar vistas nativas dentro del launcher conectadas a backends independientes (por ejemplo, un servidor Express local).

```json
{
  "id": "example",
  "name": "Extensión de Ejemplo",
  "description": "Template para desarrolladores con vista React y backend Express.",
  "version": "1.0.0",
  "type": "embedded",
  "viewId": "example",
  "sidebar": true
}
```

- `id`: Debe contener entre 2 y 64 caracteres alfanuméricos o guiones (`/^[a-z0-9][a-z0-9-]{1,63}$/i`).
- `sidebar`: Opcional (`false` por defecto). Al activarlo, añade un botón al menú lateral.
- `viewId`: Identificador de la vista embebida registrada en el launcher.

Desde el catálogo puedes activar o desactivar cualquier extensión. Su estado se guarda en el perfil local del usuario.
