async function testSellOption() {
    console.log("1. Logging in...");
    const loginRes = await fetch('http://localhost:5001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: "trader1@test.com", password: "MySuperSecretPassword@123" })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log("Token:", token ? "YES" : "NO");
    if (!token) return;

    const symbol = "NIFTY50 09 JUN 26 23200 CE";
    console.log(`\n2. Sending Sell request for ${symbol}...`);
    const t0 = Date.now();
    try {
        const sellRes = await fetch('http://localhost:5001/api/sell', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ symbol, quantity: 65, price: 118.85 })
        });
        const sellData = await sellRes.json();
        console.log("Sell Result:", sellData);
        console.log("Sell time taken:", Date.now() - t0, "ms");
    } catch (err) {
        console.log("Sell Error:", err.message);
    }
}

testSellOption();
