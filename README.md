# HASHI v1.0.1
<img width="7000" height="3020" alt="Agregar un título (2)" src="https://github.com/user-attachments/assets/ea7b1c83-6d7a-4af5-bfd4-98ed508c67ea" />
<img width="1919" height="1079" alt="Captura de pantalla 2026-09-04 225617" src="https://github.com/user-attachments/assets/ed0cd404-08bb-4abe-a638-b00e3865b4e0" />

## HOME VIEW
<img width="1919" height="1079" alt="Captura de pantalla 2026-09-02 235415" src="https://github.com/user-attachments/assets/23c283d4-df5b-4ab0-9a2b-4e176305356b" />

## DETAIL VIEW
<img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/d9af6969-a233-4e77-84aa-5b60677dfe68" />

## STEAM ACHIEVEMENT
<img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/46ea7141-7ea4-43f3-890f-35c222fe62fc" />

## STEAM NEWS
<img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/b0182e8c-ee0a-43b0-91ab-aeab7e5f48e2" />

## LOCAL GAMES
<img width="1919" height="1079" alt="Captura de pantalla 2026-09-02 210054" src="https://github.com/user-attachments/assets/838ecdcb-c334-47fe-82ae-db8b2266ee6d" />

## STEAM GAMES
<img width="1919" height="1079" alt="Captura de pantalla 2026-09-02 210215" src="https://github.com/user-attachments/assets/f4a2a7f2-ab2f-4bda-a673-c1b779c8a1f4" />

## STEAM FRIENDS
<img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/15890d61-dab3-404e-9b0a-66f20cf2230f" />


## SETTINGS
<img width="1918" height="666" alt="image" src="https://github.com/user-attachments/assets/66ea892e-358b-4fae-af39-aa300a243ac8" />



## DESARROLLO

```bash
# 1. Backend (API de logros, noticias, artwork…)
cd backend
npm install

# 2. Frontend (Electron + React)
cd ../frontend
npm install
npm run dev
```

En desarrollo el launcher arranca el backend solo (puerto `3000`). Si ya tienes
otro backend corriendo en ese puerto lo reutiliza en vez de duplicarlo; también
puedes levantarlo a mano con `npm start` dentro de `backend/`.

### Notas para Linux

- **npm bloquea scripts de instalación**: si `npm install` termina sin binario,
  aprueba los scripts con `npm install-scripts approve electron esbuild` y
  relanza `npm install` (o `node node_modules/electron/install.js`).
- **Steam**: se detectan `~/.steam/steam`, `~/.local/share/Steam`, las
  instalaciones de Flatpak (`~/.var/app/com.valvesoftware.Steam`) y Snap, además
  de las bibliotecas declaradas en `libraryfolders.vdf`.
- **Tiendas**: además de Steam, se usa [Heroic](https://heroicgameslauncher.com)
  para Epic/GOG (GOG Galaxy y el launcher de Epic no existen en Linux).
- **Juegos `.exe` locales**: se lanzan con **Wine** si está instalado
  (`wine` en el PATH). Proton es el fork de Wine de Valve, afinado para juegos
  y ligado a Steam; para lanzar un `.exe` fuera de Steam, Wine es lo directo.
- **Juegos nativos**: binarios, `.sh`, AppImage y `.desktop` se lanzan tal cual.
- **Multimedia del sistema** (MediaSession/PowerShell) es solo Windows: en Linux
  esas funciones quedan desactivadas automáticamente.

### Builds

```bash
npm run build:win    # Windows (NSIS)
npm run build:linux  # Linux (AppImage, snap, deb)
npm run build:mac    # macOS
```
