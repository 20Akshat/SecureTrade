# 🚀 Phase 5: Live Positions & Real Backend Integration

Jaisa tumne kahan, yeh lo tumhara plan! Main koi file update nahi kar raha, saara code tum khud likhoge taaki tumhari practice ho. 🔥

Dhyan se step-by-step follow karna:

### Step 1: Update Backend (`backend/server.js`)
Apni `server.js` file mein line 209 dhundo jahan tumhara `app.post('/api/sell', ...)` khatam hota hai. Theek uske neeche yeh nayi API banao jo tumhara live portfolio fetch karegi:

```javascript
// 📊 GET PORTFOLIO (LIVE POSITIONS) API
app.get('/api/portfolio', authMiddleware, async (req, res) => {
    try {
        const { data: portfolioData, error } = await supabase
            .from('portfolio')
            .select('*')
            .eq('user_id', req.user.userId);

        if (error) throw error;

        const positions = {};
        
        portfolioData.forEach(trade => {
            if (!positions[trade.symbol]) {
                positions[trade.symbol] = { symbol: trade.symbol, totalQuantity: 0, totalInvested: 0 };
            }
            const qty = Number(trade.quantity);
            const price = Number(trade.average_price);
            
            if (qty > 0) positions[trade.symbol].totalInvested += (qty * price);
            positions[trade.symbol].totalQuantity += qty;
        });

        const activePositions = Object.values(positions)
            .filter(pos => pos.totalQuantity !== 0) 
            .map(pos => {
                return {
                    symbol: pos.symbol,
                    quantity: pos.totalQuantity,
                    averagePrice: pos.totalInvested > 0 ? (pos.totalInvested / pos.totalQuantity) : 0
                };
            });

        res.status(200).json(activePositions);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch portfolio." });
    }
});
```

*(Note: Isko likhne ke baad apna `node server.js` dobara restart karna mat bhoolna!)*

---

### Step 2: Create the Positions Panel Component
Ek nayi file banao: `frontend/src/components/PositionsPanel.tsx`
Yeh tumhara wo panel hai jahan live P&L (Green/Red) aur "Lots" dikhenge! Aur isme Stop Loss/Target ka button bhi daal diya hai.

```tsx
"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

interface Position {
  symbol: string;
  quantity: number;
  averagePrice: number;
}

export default function PositionsPanel({ currentPrice }: { currentPrice: number }) {
  const { token } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);

  useEffect(() => {
    // Backend se data nikalne ka function
    const fetchPositions = async () => {
      try {
        const res = await fetch("http://localhost:5001/api/portfolio", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setPositions(data);
        }
      } catch (err) {
        console.error("Failed to load positions");
      }
    };
    
    if (token) fetchPositions();
    
    // Har 3 second mein refresh karega taaki bot ke trades turant dikh jayein!
    const interval = setInterval(fetchPositions, 3000);
    return () => clearInterval(interval);
  }, [token]);

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-4 mt-6 backdrop-blur-xl">
      <h3 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-2">Live Positions</h3>
      
      {positions.length === 0 ? (
        <p className="text-gray-400 text-sm">No open positions.</p>
      ) : (
        <div className="space-y-3">
          {positions.map((pos) => {
            const invested = pos.quantity * pos.averagePrice;
            const currentValue = pos.quantity * currentPrice;
            const pnl = currentValue - invested;
            const isProfit = pnl >= 0;

            return (
              <div key={pos.symbol} className="bg-black/40 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                <div>
                  <p className="font-bold text-white tracking-wider">{pos.symbol}</p>
                  <p className="text-xs text-gray-400">{pos.quantity} Lots @ ₹{pos.averagePrice.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono text-white">LTP: ₹{currentPrice.toFixed(2)}</p>
                  <p className={`font-bold ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
                    {isProfit ? '+' : ''}₹{pnl.toFixed(2)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stop Loss (SL) aur Target ka UI */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">Target / SL</span>
          <button className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded text-white font-medium text-xs transition-colors">
            Manage Orders
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### Step 3: Add to Dashboard!
Ab apni main file `frontend/src/app/dashboard/page.tsx` kholo.

1. Sabse upar imports mein yeh line add karo:
   `import PositionsPanel from "@/components/PositionsPanel";`

2. Jahaan par `PortfolioPanel` likha hai (Right side column mein), theek uske neeche is component ko chipka do:
   `<PositionsPanel currentPrice={currentPrice} />`

File save karo aur check karo! 🔥
