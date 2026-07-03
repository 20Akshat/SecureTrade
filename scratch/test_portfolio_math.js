const fs = require('fs');
const path = require('path');
const supabase = require('../backend/db');

const userId = '9ae19ceb-bf80-4719-b797-09b4f9751078';

async function run() {
    console.log("=== CALCULATING FROM LOCAL DB ===");
    const localDbPath = path.join(__dirname, '../backend/local_db.json');
    if (fs.existsSync(localDbPath)) {
        const localDb = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
        calculate(localDb.portfolio);
    }

    console.log("\n=== CALCULATING FROM SUPABASE ===");
    const { data, error } = await supabase.from('portfolio').select('*').eq('user_id', userId).order('created_at', { ascending: true });
    if (error) {
        console.error(error);
    } else {
        calculate(data);
    }
}

function calculate(portfolioData) {
    const positions = {};
    portfolioData.forEach(trade => {
        const symbol = trade.symbol;
        if (!positions[symbol]) {
            positions[symbol] = { symbol, quantity: 0, averagePrice: 0 };
        }
        
        const pos = positions[symbol];
        const qty = Number(trade.quantity);
        const price = Number(trade.average_price);
        
        if (pos.quantity === 0) {
            pos.quantity = qty;
            pos.averagePrice = price;
        } else if (pos.quantity > 0) {
            if (qty > 0) {
                pos.averagePrice = ((pos.quantity * pos.averagePrice) + (qty * price)) / (pos.quantity + qty);
                pos.quantity += qty;
            } else {
                pos.quantity += qty;
                if (pos.quantity < 0) {
                    pos.averagePrice = price;
                }
            }
        } else {
            if (qty < 0) {
                pos.averagePrice = ((Math.abs(pos.quantity) * pos.averagePrice) + (Math.abs(qty) * price)) / (Math.abs(pos.quantity) + Math.abs(qty));
                pos.quantity += qty;
            } else {
                pos.quantity += qty;
                if (pos.quantity > 0) {
                    pos.averagePrice = price;
                }
            }
        }
    });

    const activePositions = Object.values(positions).filter(pos => pos.quantity !== 0);
    console.log(JSON.stringify(activePositions, null, 2));
}

run();
