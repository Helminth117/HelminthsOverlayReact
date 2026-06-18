const store = require('./store');
const https = require('https');

function validateLicense(key) {
  return new Promise((resolve) => {
    // Fallback manual testing key
    if (key === 'BETA-TESTER' || key === 'HELMINTH-DEV') {
      store.updateConfig({ license_key: key });
      return resolve({ valid: true });
    }

    const data = JSON.stringify({ license_key: key });

    const options = {
      hostname: 'api.lemonsqueezy.com',
      port: 443,
      path: '/v1/licenses/validate',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.valid) {
            store.updateConfig({ license_key: key });
            resolve({ valid: true });
          } else {
            resolve({ valid: false, error: parsed.error || 'La clave de licencia no es válida.' });
          }
        } catch (e) {
          resolve({ valid: false, error: 'Error de conexión con el servidor de licencias.' });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ valid: false, error: 'Error de red. Verifica tu conexión a internet.' });
    });

    req.write(data);
    req.end();
  });
}

function checkActivation() {
  const config = store.getConfig();
  if (!config.license_key) return false;
  
  // Here we would ideally check offline cache or ping the server periodically in the background
  return true;
}

module.exports = { validateLicense, checkActivation };
