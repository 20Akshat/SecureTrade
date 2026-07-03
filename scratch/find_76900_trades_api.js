const http = require('http');
const jwt = require('../backend/node_modules/jsonwebtoken');

const userId = '9ae19ceb-bf80-4719-b797-09b4f9751078';
const email = 'akshatmarwadi5@gmail.com';
const token = jwt.sign({ userId, email }, 'super_secret_trading_key_123', { expiresIn: '1d' });

function makeRequest(path, label) {
  const options = {
    hostname: 'localhost',
    port: 5001,
    path: path,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        const matches = parsed.filter(t => t.symbol.includes('76900'));
        console.log("Matching trades returned by API:");
        console.log(JSON.stringify(matches, null, 2));
      } catch (err) {
        console.log("Error parsing:", err.message);
      }
    });
  });

  req.on('error', (err) => {
    console.error(`HTTP Request Error for ${label}:`, err.message);
  });

  req.end();
}

makeRequest('/api/trades?all=true', 'ALL TRADES');
