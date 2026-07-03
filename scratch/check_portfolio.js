const supabase = require('../backend/db');

async function main() {
    try {
        const { data: users, error: userError } = await supabase
            .from('users')
            .select('*');
        if (userError) throw userError;
        
        console.log("USERS:");
        users.forEach(u => {
            console.log(`ID: ${u.id} | Email: ${u.email} | Balance: ${u.balance}`);
        });

        const { data: portfolio, error: portError } = await supabase
            .from('portfolio')
            .select('*')
            .order('created_at', { ascending: true });
        if (portError) throw portError;

        console.log("\nPORTFOLIO TRANSACTIONS (TRADE HISTORY):");
        let initialBalance = 100000;
        let runningBalance = initialBalance;
        let realisedPnl = 0;
        
        // We will compute realized P&L and simulated balance
        const symbolStats = {};

        portfolio.forEach((t, idx) => {
            const qty = Number(t.quantity);
            const price = Number(t.average_price);
            const symbol = t.symbol;
            
            const cost = qty * price;
            runningBalance -= cost; // buy reduces balance (qty > 0), sell increases balance (qty < 0)

            if (!symbolStats[symbol]) {
                symbolStats[symbol] = { runningQty: 0, runningAvgBuyPrice: 0 };
            }

            const stats = symbolStats[symbol];
            let tradePnl = 0;
            let buyPrice = 0;

            if (qty > 0) {
                const totalCost = (stats.runningAvgBuyPrice * stats.runningQty) + (qty * price);
                stats.runningQty += qty;
                stats.runningAvgBuyPrice = stats.runningQty > 0 ? totalCost / stats.runningQty : 0;
                buyPrice = price;
            } else {
                buyPrice = stats.runningAvgBuyPrice;
                tradePnl = Math.abs(qty) * (price - buyPrice);
                realisedPnl += tradePnl;
                stats.runningQty += qty;
                if (stats.runningQty <= 0) {
                    stats.runningQty = 0;
                    stats.runningAvgBuyPrice = 0;
                }
            }

            console.log(`${idx + 1}. [${t.created_at}] ${qty > 0 ? 'BUY' : 'SELL'} | Symbol: ${symbol} | Qty: ${qty} | Price: ${price} | Cash Flow: ${-cost} | Running Balance (calculated): ${runningBalance} | Realised P&L: ${tradePnl}`);
        });

        console.log("\nSUMMARY:");
        console.log(`Sum of Cash Flows (Initial + Profit/Loss): ${runningBalance}`);
        console.log(`Total Realised P&L calculated: ${realisedPnl}`);

    } catch (err) {
        console.error("Error:", err.message);
    }
}

main();
