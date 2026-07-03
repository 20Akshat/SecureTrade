const http = require('http');

const postData = JSON.stringify({
  symbol: 'NIFTY50 07 JUL 26 24200 CE'
});

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/option-ltp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log("Response Status:", res.statusCode);
    console.log("Response Body:", data);
  });
});

req.on('error', (err) => {
  console.error("HTTP Request Error:", err.message);
});

req.write(postData);
req.end();
