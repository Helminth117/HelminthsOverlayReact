const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getSteamPath() {
  try {
    const regCommand = `reg query "HKCU\\Software\\Valve\\Steam" /v SteamPath`;
    const output = execSync(regCommand, { encoding: 'utf8' });
    const match = output.match(/SteamPath\s+REG_SZ\s+(.*)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  } catch (err) {
    // Si falla el registro, intentamos rutas comunes
    const defaultPaths = [
      'C:\\Program Files (x86)\\Steam',
      'C:\\Program Files\\Steam'
    ];
    for (const p of defaultPaths) {
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

function parseVdf(content) {
  const libraries = [];
  const regex = /"path"\s+"([^"]+)"/gi;
  let match;
  while ((match = regex.exec(content)) !== null) {
    libraries.push(match[1].replace(/\\\\/g, '\\'));
  }
  return libraries;
}

function getExeFromDir(dir) {
  if (!fs.existsSync(dir)) return null;
  let exes = [];
  
  // Función recursiva para buscar .exe hasta 2 niveles de profundidad
  function scanDir(currentDir, depth) {
    if (depth > 2) return;
    try {
      const files = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const file of files) {
        if (file.isDirectory()) {
          scanDir(path.join(currentDir, file.name), depth + 1);
        } else if (file.isFile() && file.name.toLowerCase().endsWith('.exe')) {
          const fullPath = path.join(currentDir, file.name);
          const stats = fs.statSync(fullPath);
          exes.push({
            name: file.name.replace(/\.exe$/i, ''),
            size: stats.size
          });
        }
      }
    } catch (err) { }
  }
  
  scanDir(dir, 0);
  
  if (exes.length === 0) return null;
  
  // Filtrar exes comunes de librerias/launchers
  const ignored = ['crashreporter', 'unins000', 'launcher', 'setup', 'dxwebsetup', 'createdump', 'steamerrorreporter', 'cef', 'awesomium', 'uninstaller', 'sysinfo'];
  exes = exes.filter(e => !ignored.some(i => e.name.toLowerCase().includes(i)));
  
  if (exes.length === 0) return null;
  
  // Ordenar por tamaño (el más pesado suele ser el juego real)
  exes.sort((a, b) => b.size - a.size);
  
  return exes[0].name;
}

function scanSteamGames() {
  const steamPath = getSteamPath();
  if (!steamPath) return [];

  const libraryFoldersFile = path.join(steamPath, 'steamapps', 'libraryfolders.vdf');
  let libraries = [steamPath];
  
  if (fs.existsSync(libraryFoldersFile)) {
    const vdfContent = fs.readFileSync(libraryFoldersFile, 'utf8');
    const extraLibs = parseVdf(vdfContent);
    libraries = [...new Set([...libraries, ...extraLibs])];
  }

  const games = [];

  for (const lib of libraries) {
    const steamapps = path.join(lib, 'steamapps');
    if (!fs.existsSync(steamapps)) continue;

    const files = fs.readdirSync(steamapps);
    for (const file of files) {
      if (file.startsWith('appmanifest_') && file.endsWith('.acf')) {
        try {
          const acfContent = fs.readFileSync(path.join(steamapps, file), 'utf8');
          const nameMatch = acfContent.match(/"name"\s+"([^"]+)"/i);
          const dirMatch = acfContent.match(/"installdir"\s+"([^"]+)"/i);
          
          if (nameMatch && dirMatch) {
            const name = nameMatch[1];
            // Ignorar herramientas de Steamworks y Proton
            if (name.includes('Steamworks') || name.includes('Proton')) continue;
            
            const installdir = dirMatch[1];
            const gamePath = path.join(steamapps, 'common', installdir);
            
            const exeProcess = getExeFromDir(gamePath);
            if (exeProcess) {
              games.push({
                name: name,
                process: exeProcess,
                accent: '#1D9E75', // Color verde por defecto
                imageUrl: '',
                enabled: true
              });
            }
          }
        } catch (err) { }
      }
    }
  }

  return games;
}

module.exports = { scanSteamGames };
