const axios = require('axios');

async function checkVercel() {
    try {
        console.log("Checking Vercel deployment...");
        const res = await axios.get('https://frontend-seven-weld-84.vercel.app');
        console.log("Status Code:", res.status);
        console.log("Headers:", res.headers);
        // Look for any indicator in the HTML
        const html = res.data;
        console.log("HTML length:", html.length);
        if (html.includes("BotControl")) {
            console.log("✅ Found BotControl reference in HTML.");
        } else {
            console.log("❌ BotControl text not directly in SSR HTML (normal for SPA/Next.js client-side).");
        }
        
        // Print some part of HTML if visible
        console.log("HTML snippet:", html.slice(0, 1000));
    } catch (err) {
        console.error("Error fetching Vercel:", err.message);
    }
}
checkVercel();
