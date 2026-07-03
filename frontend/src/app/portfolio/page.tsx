"use client";

import { useAuth } from "@/context/AuthContext";
import { useMarket } from "@/context/MarketContext";
import PortfolioPanel from "@/components/PortfolioPanel";
import PositionsPanel from "@/components/PositionsPanel";

export default function PortfolioPage() {
  const { token, balance, updateBalance } = useAuth();
  const { marketData, selectedSymbol } = useMarket();
  const activeData = marketData[selectedSymbol] || { price: 0 };
  const currentPrice = activeData.price;

  if (!token) return (
    <div className="text-slate-500 p-8 font-semibold text-center">
      Please login to view your portfolio.
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <header className="mb-4">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">Your Portfolio</h1>
        <p className="text-slate-450 text-xs font-semibold">Manage your open positions, trades, and account terminal.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Positions and Trades Panel */}
        <div className="lg:col-span-2">
          <PositionsPanel />
        </div>

        {/* Side Trading Terminal */}
        <div className="lg:col-span-1">
          <PortfolioPanel 
            balance={balance} 
            token={token} 
            currentPrice={currentPrice} 
            symbol={selectedSymbol}
            onTradeSuccess={updateBalance} 
          />
        </div>

      </div>
    </div>
  );
}