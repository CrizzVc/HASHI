import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const sourceDir = path.join(rootDir, 'resources', 'backend');
const distDir = path.join(rootDir, 'dist');

if (!fs.existsSync(sourceDir)) {
  console.error(`[Backend Copy] Source not found: ${sourceDir}`);
  process.exit(1);
}

// electron-builder genera un directorio dist/<plataforma>-unpacked distinto
// según el SO: win-unpacked, linux-unpacked, mac, mac-arm64, mac-universal…
const unpackedPrefix =
  process.platform === 'win32' ? 'win-unpacked' : process.platform === 'darwin' ? 'mac' : 'linux-unpacked';

const unpackedDir = fs.existsSync(distDir)
  ? fs
      .readdirSync(distDir)
      .filter((entry) => entry === unpackedPrefix || entry.startsWith(unpackedPrefix))
      .sort()
      .pop()
  : undefined;

if (!unpackedDir) {
  console.error(`[Backend Copy] No se encontró '${unpackedPrefix}' dentro de ${distDir}`);
  process.exit(1);
}

const targetDir = path.join(distDir, unpackedDir, 'resources', 'backend');

fs.rmSync(targetDir, { recursive: true, force: true });
fs.mkdirSync(path.dirname(targetDir), { recursive: true });
fs.cpSync(sourceDir, targetDir, { recursive: true, force: true });

console.log(`[Backend Copy] Copied ${sourceDir} -> ${targetDir}`);
