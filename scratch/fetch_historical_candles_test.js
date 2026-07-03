const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/historical-candles?symbol=NIFTY50%2007%20JUL%2026%2024100%20CE&timeframe=5&range=Y',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log("Response Status:", res.statusCode);
    const parsed = JSON.parse(data);
    console.log("Number of candles returned:", parsed.length);
    if (parsed.length > 0) {
        console.log("First candle:", parsed[0]);
        console.log("Last candle:", parsed[parsed.length - 1]);
    }
  });
});

req.on('error', (err) => {
  console.error("HTTP Request Error:", err.message);
});

req.end();
