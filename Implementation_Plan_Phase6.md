# 🚀 Phase 6: Multi-Instrument Market & Accurate Individual P&L

Lo bhai, saara code ready hai! Is baar file main change nahi kar raha, tum khud copy-paste karke save karna. 

---

### Step 1: Update Backend WebSocket (`backend/server.js`)
Apni `server.js` file ke sabse end mein jao. Wahan jahan `const RSI_PERIOD = 14;` likha hai uske neeche ka saara code **delete** karo aur yeh naya "Multi-Market Engine" daal do:

```javascript
// --- 🤖 THE AI ALGO-TRADING ENGINE (MULTI-MARKET) ---
const RSI_PERIOD = 14;

// NAYA: Ab har symbol ki apni alag duniya hai!
const marketState = {
    "NIFTY50": { history: [], currentPrice: 22000 },
    "SENSEX": { history: [], currentPrice: 73000 },
    "BANKNIFTY": { history: [], currentPrice: 48000 }
};

function calculateRSI(prices) {
    if (prices.length < RSI_PERIOD + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = prices.length - RSI_PERIOD; i < prices.length; i++) {
        let diff = prices[i] - prices[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
    }
    let avgGain = gains / RSI_PERIOD;
    let avgLoss = Math.abs(losses / RSI_PERIOD);
    if (avgLoss === 0) return 100;
    let rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

let scenarioStep = 0;

wss.on('connection', (ws) => {
    console.log("🟢 New Trader Connected to Multi-Market!");
    
    const interval = setInterval(() => {
        scenarioStep++;
        const liveMarketUpdates = {};

        // Har ek symbol ka live data alag se calculate hoga!
        for (const symbol in marketState) {
            let price = marketState[symbol].currentPrice;
            
            price += (Math.random() * 20 - 10); // Standard volatility
            
            if (scenarioStep < 10) price -= 20; 
            else if (scenarioStep > 15 && scenarioStep < 30) price += 30; 
            
            if (scenarioStep > 60) scenarioStep = 0; // Restart demo cycle

            marketState[symbol].currentPrice = price;
            
            marketState[symbol].history.push(price);
            if (marketState[symbol].history.length > 50) marketState[symbol].history.shift();
            
            const rsi = calculateRSI(marketState[symbol].history);
            let signal = "WAIT";
            if (rsi < 30) signal = "STRONG BUY (Oversold)";
            else if (rsi > 70) signal = "STRONG SELL (Overbought)";
            
            // Dictionary mein save kiya
            liveMarketUpdates[symbol] = {
                price: price.toFixed(2),
                rsi: rsi.toFixed(2),
                signal: signal
            };
        }
        
        // Ek saath poori market ka data bhej diya!
        ws.send(JSON.stringify(liveMarketUpdates));
    }, 1000);

    ws.on('close', () => {
        console.log("🔴 Trader Disconnected");
        clearInterval(interval);
    });
});
```
*(Server ko restart (`Ctrl+C` then `node server.js`) zaroor karna iske baad!)*

---

### Step 2: Update `frontend/src/context/MarketContext.tsx`
Is poori file ko delete karke yeh naya version daalo jo Dictionary of prices handle karega aur tumhe Symbol choose karne dega:

```tsx
"use client";
import { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { useAuth } from "./AuthContext";

interface MarketData { price: number; rsi: number; signal: string; }

interface MarketContextType {
  marketData: Record<string, MarketData>; // NAYA: Sabki price alag!
  isAutoTradeActive: boolean;
  toggleAutoTrade: () => void;
  selectedSymbol: string;
  setSelectedSymbol: (sym: string) => void;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

export function MarketProvider({ children }: { children: ReactNode }) {
  const { token, updateBalance } = useAuth();
  
  const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
  const [selectedSymbol, setSelectedSymbol] = useState("NIFTY50");
  const [isAutoTradeActive, setIsAutoTradeActive] = useState<boolean>(false);
  
  const stateRef = useRef({ isAutoTradeActive, token, selectedSymbol });

  useEffect(() => {
    stateRef.current = { isAutoTradeActive, token, selectedSymbol };
  }, [isAutoTradeActive, token, selectedSymbol]);

  const toggleAutoTrade = () => setIsAutoTradeActive(prev => !prev);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:5001");
    let isTrading = false;

    ws.onmessage = async (event) => {
      // Ab data object ki form mein aayega
      const data = JSON.parse(event.data);
      
      const formattedData: Record<string, MarketData> = {};
      for (const sym in data) {
        formattedData[sym] = {
          price: parseFloat(data[sym].price),
          rsi: parseFloat(data[sym].rsi),
          signal: data[sym].signal
        };
      }
      setMarketData(formattedData);

      // --- 🤖 AUTO TRADE ENGINE (Sirf Selected Symbol ke liye) ---
      const currentState = stateRef.current;
      if (currentState.isAutoTradeActive && currentState.token && !isTrading) {
        const activeData = formattedData[currentState.selectedSymbol];
        
        if (activeData && (activeData.signal.includes("BUY") || activeData.signal.includes("SELL"))) {
            isTrading = true;
            const type = activeData.signal.includes("BUY") ? "buy" : "sell";
            try {
                const res = await fetch(`http://localhost:5001/api/${type}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentState.token}` },
                    body: JSON.stringify({ symbol: currentState.selectedSymbol, quantity: 1, price: activeData.price }),
                });
                const resData = await res.json();
                if (res.ok) updateBalance(resData.newBalance);
            } catch (err) {} 
            finally { setTimeout(() => { isTrading = false; }, 2000); }
        }
      }
    };

    return () => ws.close();
  }, [updateBalance]);

  return (
    <MarketContext.Provider value={{ marketData, isAutoTradeActive, toggleAutoTrade, selectedSymbol, setSelectedSymbol }}>
      {children}
    </MarketContext.Provider>
  );
}

export function useMarket() {
  const context = useContext(MarketContext);
  if (!context) throw new Error("error");
  return context;
}
```

---

### Step 3: Update `frontend/src/components/PositionsPanel.tsx`
Ab hum `currentPrice` ko hata denge, kyunki Positions panel apni khud ki price marketData se nikal lega!

```tsx
"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useMarket } from "@/context/MarketContext"; // NAYA IMPORT

interface Position { symbol: string; quantity: number; averagePrice: number; }

export default function PositionsPanel() {
  const { token } = useAuth();
  const { marketData } = useMarket(); // Saari market ka data utha lo!
  const [positions, setPositions] = useState<Position[]>([]);

  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const res = await fetch("http://localhost:5001/api/portfolio", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setPositions(data);
        }
      } catch (err) {}
    };
    if (token) fetchPositions();
    const interval = setInterval(fetchPositions, 3000);
    return () => clearInterval(interval);
  }, [token]);

  // 💰 Exact math: Har symbol ki live price uske data se nikalo!
  const totalPnl = positions.reduce((acc, pos) => {
    const invested = pos.quantity * pos.averagePrice;
    const livePrice = marketData[pos.symbol]?.price || pos.averagePrice; // Sahi price pick karo
    const currentValue = pos.quantity * livePrice;
    return acc + (currentValue - invested);
  }, 0);
  
  const isTotalProfit = totalPnl >= 0;

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-4 mt-6 backdrop-blur-xl">
      <h3 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-2">Live Positions</h3>
      
      <div className="bg-black/60 rounded-2xl p-4 mb-4 text-center border border-white/5 shadow-inner">
        <p className="text-gray-400 text-sm mb-1">Total P&L</p>
        <p className={`text-3xl font-bold ${isTotalProfit ? 'text-green-500' : 'text-red-500'} tracking-tight`}>
          {isTotalProfit ? '+' : ''}₹{totalPnl.toFixed(2)}
        </p>
      </div>

      {positions.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-4">No open positions.</p>
      ) : (
        <div className="space-y-3">
          {positions.map((pos) => {
            const invested = pos.quantity * pos.averagePrice;
            const livePrice = marketData[pos.symbol]?.price || pos.averagePrice; // Individual live price
            const currentValue = pos.quantity * livePrice;
            const pnl = currentValue - invested;
            const isProfit = pnl >= 0;

            return (
              <div key={pos.symbol} className="bg-black/40 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                <div>
                  <p className="font-bold text-white tracking-wider">{pos.symbol}</p>
                  <p className="text-xs text-gray-400">{pos.quantity} Lots @ ₹{pos.averagePrice.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono text-white">LTP: ₹{livePrice.toFixed(2)}</p>
                  <p className={`font-bold ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
                    {isProfit ? '+' : ''}₹{pnl.toFixed(2)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

---

### Step 4: Final Touch `dashboard/page.tsx`
Abhi ke liye apne dashboard file mein sirf `PositionsPanel` se prop nikal do, baki sab theek hai (Baad mein hum dropdown banayenge!)
Change line:
`<PositionsPanel currentPrice={currentPrice} />`
To:
`<PositionsPanel />`

Khatam! Isko implement karke batao! 😎
