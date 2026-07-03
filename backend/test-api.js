async function testAPI() {
    console.log("⏳ Signup ki request bhej rahe hain...");
    
    // 1. SIGNUP TEST
    try {
        const signupRes = await fetch('http://localhost:5001/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: "trader1@test.com", password: "MySuperSecretPassword@123" })
        });
        const signupData = await signupRes.json();
        console.log("✅ Signup Result:", signupData, "\n");
    } catch(e) {
        console.log("❌ Signup Error:", e);
    }

    console.log("⏳ Login ki request bhej rahe hain...");
    
    // 2. LOGIN TEST
    let token = null;
    try {
        const loginRes = await fetch('http://localhost:5001/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: "trader1@test.com", password: "MySuperSecretPassword@123" })
        });
        const loginData = await loginRes.json();
        console.log("✅ Login Result:", loginData, "\n");
        token = loginData.token; // Token ko save kar liya
    } catch(e) {
        console.log("❌ Login Error:", e);
    }

    // 3. BUY & SELL TEST
    if (token) {
        console.log("🛒 Buy ki request bhej rahe hain (2 NIFTY50 Shares at ₹22000)...");
        try {
            const buyRes = await fetch('http://localhost:5001/api/buy', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Security Guard ko token dikha rahe hain
                },
                body: JSON.stringify({ symbol: "NIFTY50", quantity: 2, price: 22000 })
            });
            const buyData = await buyRes.json();
            console.log("✅ Buy Result:", buyData, "\n");
        } catch(e) {
            console.log("❌ Buy Error:", e);
        }

        console.log("💸 Sell ki request bhej rahe hain (2 NIFTY50 Shares at ₹22100)...");
        try {
            const sellRes = await fetch('http://localhost:5001/api/sell', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Security Guard ko token dikha rahe hain
                },
                body: JSON.stringify({ symbol: "NIFTY50", quantity: 2, price: 22100 })
            });
            const sellData = await sellRes.json();
            console.log("✅ Sell Result:", sellData, "\n");
        } catch(e) {
            console.log("❌ Sell Error:", e);
        }
    } else {
        console.log("⚠️ Token nahi mila, isliye Buy/Sell test nahi kiya.");
    }
}

testAPI();