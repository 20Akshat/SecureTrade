"use client";
import { useState } from "react";
import { useMarket } from "@/context/MarketContext";

interface PortfolioProps {
  balance: number;
  token: string;
  currentPrice: number;
  symbol?: string;
  onTradeSuccess: (newBalance: number) => void;
}

export default function PortfolioPanel({ balance, token, currentPrice, symbol = "NIFTY50", onTradeSuccess }: PortfolioProps) {
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [product, setProduct] = useState<"MIS" | "NRML">("NRML");
  const [limitPrice, setLimitPrice] = useState<number>(currentPrice);
  const [activeBtn, setActiveBtn] = useState<"buy" | "sell" | null>(null);

  const totalValue = quantity * (orderType === "LIMIT" ? limitPrice : currentPrice);

  const handleTrade = async (type: "buy" | "sell") => {
    setLoading(true);
    setActiveBtn(type);
    const tradePrice = orderType === "LIMIT" ? limitPrice : currentPrice;
    try {
      const res = await fetch(`https://securetrade-n3qh.onrender.com/api/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ symbol, quantity: Number(quantity), price: tradePrice }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onTradeSuccess(data.newBalance);
      setTimeout(() => setActiveBtn(null), 1000);
    } catch (err: any) {
      if (err.message && (err.message.includes("Unauthorized") || err.message.includes("expired") || err.message.includes("Token is invalid"))) {
        setActiveBtn(null);
        return;
      }
      alert("❌ " + err.message);
      setActiveBtn(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      
      {/* Header: Instrument & Price */}
      <div className="bg-slate-50 border-b border-slate-200 p-4">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Instrument</span>
            <p className="text-slate-800 font-extrabold text-lg">{symbol}</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-bold block uppercase mb-0.5">LTP</span>
            <p className="text-xl font-black text-blue-600 font-mono">
              {currentPrice === 0 ? "—" : `₹${currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </p>
          </div>
        </div>
        
        {/* Margin display */}
        <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex justify-between items-center text-xs font-semibold">
          <span className="text-slate-450">Available margin:</span>
          <span className="text-green-600 font-bold">₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div className="p-4 space-y-4 text-xs font-semibold">
        
        {/* Product Selection */}
        <div>
          <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1.5">Product Type</span>
          <div className="flex bg-slate-100 rounded-xl p-0.5 gap-0.5">
            {(["MIS", "NRML"] as const).map(p => (
              <button 
                key={p} 
                onClick={() => setProduct(p)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  product === p 
                    ? 'bg-white text-slate-850 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Order Type Selection */}
        <div>
          <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1.5">Order Type</span>
          <div className="flex bg-slate-100 rounded-xl p-0.5 gap-0.5">
            {(["MARKET", "LIMIT"] as const).map(o => (
              <button 
                key={o} 
                onClick={() => setOrderType(o)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  orderType === o 
                    ? 'bg-white text-slate-850 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        {/* Limit Price */}
        {orderType === "LIMIT" && (
          <div>
            <span className="text-slate-405 text-[10px] uppercase font-bold block mb-1.5">Limit Price</span>
            <input 
              type="number" 
              step="0.05"
              value={limitPrice} 
              onChange={e => setLimitPrice(Number(e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 font-mono font-bold focus:outline-none focus:border-blue-500 transition-all text-right text-sm" 
            />
          </div>
        )}

        {/* Quantity editor */}
        <div>
          <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1.5">Quantity (Lots)</span>
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            <button 
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="px-4 py-2.5 text-slate-600 text-lg font-bold hover:bg-slate-200 transition-all"
            >
              −
            </button>
            <input 
              type="number" 
              min="1" 
              value={quantity} 
              onChange={e => setQuantity(Number(e.target.value))}
              className="flex-1 bg-transparent text-slate-800 font-black text-center text-sm focus:outline-none py-2 font-mono" 
            />
            <button 
              onClick={() => setQuantity(q => q + 1)}
              className="px-4 py-2.5 text-slate-600 text-lg font-bold hover:bg-slate-200 transition-all"
            >
              +
            </button>
          </div>
        </div>

        {/* Total Cost Value Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex justify-between items-center text-xs">
          <span className="text-slate-550 font-bold">Estimated Cost:</span>
          <span className="text-slate-800 font-black text-sm font-mono">
            ₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3.5 pt-1.5">
          <button 
            onClick={() => handleTrade("buy")} 
            disabled={loading || currentPrice === 0}
            className={`py-3 rounded-xl font-extrabold text-xs text-white transition-all shadow-sm ${
              activeBtn === 'buy' ? 'bg-green-400' : 'bg-green-600 hover:bg-green-500 shadow-green-100'
            } disabled:opacity-40 uppercase tracking-wider`}
          >
            {loading && activeBtn === 'buy' ? '...' : 'BUY'}
          </button>
          <button 
            onClick={() => handleTrade("sell")} 
            disabled={loading || currentPrice === 0}
            className={`py-3 rounded-xl font-extrabold text-xs text-white transition-all shadow-sm ${
              activeBtn === 'sell' ? 'bg-red-450' : 'bg-red-650 hover:bg-red-550 shadow-red-100'
            } disabled:opacity-40 uppercase tracking-wider`}
          >
            {loading && activeBtn === 'sell' ? '...' : 'SELL'}
          </button>
        </div>

      </div>
    </div>
  );
}