"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle, FileText } from "lucide-react";

interface Trade {
  id: string;
  symbol: string;
  quantity: number;
  entryPrice: number;
  type: 'BUY' | 'SELL';
  createdAt: string;
}

const LOT_SIZES: Record<string, number> = { NIFTY50: 75, BANKNIFTY: 15, SENSEX: 10 };

export default function OrdersPage() {
  const { token } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrades = async () => {
    if (!token) return;
    try {
      const res = await fetch("https://securetrade-n3qh.onrender.com/api/trades", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setTrades(await res.json());
      }
    } catch (e: any) {
      console.warn("Orders fetch error:", e?.message || e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();
    const interval = setInterval(fetchTrades, 4000);
    return () => clearInterval(interval);
  }, [token]);

  const getLots = (symbol: string, quantity: number) => {
    const indexName = Object.keys(LOT_SIZES).find(k => symbol.includes(k)) || "NIFTY50";
    const lotSize = LOT_SIZES[indexName];
    return Math.round(Math.abs(quantity) / lotSize) || Math.abs(quantity);
  };

  if (!token) {
    return (
      <div className="text-slate-500 p-8 font-semibold text-center">
        Please login to view your order history.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <header className="mb-4">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">Order Book</h1>
        <p className="text-slate-450 text-xs font-semibold font-sans">View your executed trades, limit orders, and transaction details.</p>
      </header>

      {/* Orders List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm min-h-[400px]">
        <h2 className="text-sm font-extrabold text-slate-800 mb-4 uppercase tracking-wider">Executed Orders ({trades.length})</h2>
        
        {loading && trades.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-bold uppercase text-xs">
            Loading your orders...
          </div>
        ) : trades.length === 0 ? (
          <div className="text-center py-20">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
            <p className="text-slate-450 text-xs font-bold uppercase">No Orders Found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Start trading from the main dashboard to view your transactions.</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {trades.map((trade) => {
              const time = new Date(trade.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              const date = new Date(trade.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
              const lots = getLots(trade.symbol, trade.quantity);
              const isBuy = trade.type === 'BUY';

              return (
                <div 
                  key={trade.id} 
                  className="border border-slate-150 rounded-xl p-3.5 hover:border-slate-300 hover:bg-slate-50/30 transition-all flex justify-between items-center bg-white"
                >
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      <span className={`text-[8px] font-black px-1.5 py-0.2 rounded ${
                        isBuy ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-705'
                      }`}>
                        {trade.type}
                      </span>
                      <p className="font-extrabold text-slate-800 text-xs tracking-wide leading-none">
                        {trade.symbol}
                      </p>
                    </div>
                    
                    <p className="text-[11px] text-slate-500 font-semibold mb-1">
                      {lots} Lot{lots > 1 ? 's' : ''} ({Math.abs(trade.quantity)} shares) · NRML
                    </p>
                    
                    <span className="text-[10px] text-slate-400 font-bold block uppercase leading-none">
                      Execution Price: <span className="font-mono text-slate-650">₹{trade.entryPrice.toFixed(2)}</span>
                    </span>
                  </div>
                  
                  <div className="text-right shrink-0 ml-2 text-xs">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase mb-1">Executed At</span>
                    <span className="text-slate-700 font-extrabold font-mono block">
                      {time}
                    </span>
                    <span className="text-[9px] text-slate-400 font-semibold">
                      {date}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}