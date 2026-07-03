const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:5001');

ws.on('open', () => {
    console.log("🟢 Connected to SecureTrade WebSocket Server");
});

ws.on('message', (data) => {
    try {
        const updates = JSON.parse(data.toString());
        console.log("📥 Received updates at", new Date().toLocaleTimeString());
        console.log(JSON.stringify(updates, null, 2));
        ws.close(); // Close after receiving one update
    } catch (err) {
        console.error("❌ Failed to parse updates:", err.message);
        ws.close();
    }
});

ws.on('error', (err) => {
    console.error("❌ WebSocket Error:", err.message);
});

ws.on('close', () => {
    console.log("🔴 Connection Closed");
});
