"use client";
import { Activity, BrainCircuit, Power } from "lucide-react";
import { useMarket } from "@/context/MarketContext"; // Jadoo yahan se aayega

interface BotControlProps { rsi: number; signal: string; }

export default function BotControl({ rsi, signal }: BotControlProps) {
  // Global Market Context se Auto-Trade ka state nikala
  const { isAutoTradeActive, toggleAutoTrade, isZeroHeroActive, toggleZeroHero, strategyMode, setStrategyMode, enabledSymbols, setEnabledSymbols, botMaxPremium, setBotMaxPremium } = useMarket();

  let signalColor = "text-yellow-400"; let bgColor = "bg-yellow-500/10";
  if (signal.includes("BUY")) { signalColor = "text-green-400"; bgColor = "bg-green-500/10"; } 
  else if (signal.includes("SELL")) { signalColor = "text-red-400"; bgColor = "bg-red-500/10"; }

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl mb-8 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-purple-500/20 rounded-2xl shadow-[0_0_15px_rgba(168,85,247,0.5)]">
            <BrainCircuit className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">AI Trading Bot</h2>
            <p className="text-gray-400 text-sm">Real-time Momentum Analysis</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* STRATEGY MODE SELECTOR */}
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-extrabold text-purple-400 tracking-wider uppercase mb-1">🎯 Strategy</span>
            <select
              value={strategyMode}
              onChange={(e) => setStrategyMode(e.target.value as any)}
              className="bg-gray-800 text-white text-xs font-bold rounded-lg px-2 py-1 border border-white/10 focus:outline-none cursor-pointer hover:bg-gray-700 transition-all h-7"
            >
              <option value="auto">🤖 AI Auto-Detect (Dynamic)</option>
              <option value="crossover">RSI + EMA Cross</option>
              <option value="5ema">Power of Stocks 5EMA</option>
              <option value="gainz">Gainz Algo Suite</option>
            </select>
          </div>
          {/* MAX PREMIUM PRICE SELECTOR */}
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-extrabold text-blue-400 tracking-wider uppercase mb-1">💸 Max Premium</span>
            <select
              value={botMaxPremium}
              onChange={(e) => setBotMaxPremium(Number(e.target.value))}
              className="bg-gray-800 text-white text-xs font-bold rounded-lg px-2 py-1 border border-white/10 focus:outline-none cursor-pointer hover:bg-gray-700 transition-all h-7 w-28"
            >
              <option value={100}>₹100 (Conservative)</option>
              <option value={200}>₹200 (Safe)</option>
              <option value={250}>₹250 (Moderate)</option>
              <option value={350}>₹350 (Aggressive)</option>
              <option value={500}>₹500 (High Risk)</option>
              <option value={10000}>No Limit</option>
            </select>
          </div>
          {/* ZERO-HERO MODE TOGGLE */}
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-extrabold text-yellow-400 tracking-wider uppercase mb-1">⚡ Zero-Hero</span>
            <button 
              onClick={toggleZeroHero}
              disabled={!isAutoTradeActive}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all focus:outline-none cursor-pointer ${
                !isAutoTradeActive ? "opacity-30 cursor-not-allowed bg-gray-700" :
                isZeroHeroActive ? "bg-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.6)]" : "bg-gray-600"
              }`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                isZeroHeroActive ? "translate-x-8" : "translate-x-1"
              }`} />
            </button>
          </div>

          {/* AUTO-TRADE TOGGLE SWITCH */}
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-extrabold text-green-400 tracking-wider uppercase mb-1">🤖 Auto-Trade</span>
            <button 
              onClick={toggleAutoTrade}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                isAutoTradeActive ? "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.5)]" : "bg-gray-600"
              }`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                isAutoTradeActive ? "translate-x-8" : "translate-x-1"
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* SCANNED INDICES SELECTION */}
      <div className="mb-5 bg-black/20 p-3 rounded-2xl border border-white/5">
        <span className="text-[10px] font-extrabold text-blue-400 tracking-wider uppercase mb-2 block text-left">📡 Scanned Indices</span>
        <div className="flex space-x-2">
          {["NIFTY50", "BANKNIFTY", "SENSEX"].map((sym) => {
            const isEnabled = enabledSymbols.includes(sym);
            return (
              <button
                key={sym}
                onClick={() => {
                  if (isEnabled) {
                    if (enabledSymbols.length > 1) {
                      setEnabledSymbols(enabledSymbols.filter((s) => s !== sym));
                    }
                  } else {
                    setEnabledSymbols([...enabledSymbols, sym]);
                  }
                }}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                  isEnabled
                    ? "bg-blue-600/35 border-blue-500/50 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                    : "bg-transparent border-white/10 text-gray-500 hover:bg-white/5"
                }`}
              >
                {sym === "NIFTY50" ? "NIFTY" : sym === "BANKNIFTY" ? "BANKNIFTY" : "SENSEX"}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-black/40 p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
          <Activity className="w-5 h-5 text-gray-400 mb-2" />
          <span className="text-gray-400 text-sm">Current RSI (14)</span>
          <span className={`text-2xl font-mono font-bold mt-1 ${rsi < 35 ? 'text-green-400' : rsi > 65 ? 'text-red-400' : 'text-white'}`}>
            {rsi === 0 ? "--" : rsi}
          </span>
        </div>
        <div className={`p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center ${bgColor}`}>
          <span className="text-gray-400 text-sm mb-1">Bot Recommendation</span>
          <span className={`text-lg font-bold text-center ${signalColor}`}>{signal}</span>
        </div>
      </div>
      
      {/* Auto-Trade Status Indicator */}
      <div className="mt-4 flex items-center justify-center space-x-2 bg-black/30 p-2 rounded-xl">
        <Power className={`w-4 h-4 ${isAutoTradeActive ? "text-green-500" : "text-gray-500"}`} />
        <span className="text-sm font-medium text-gray-300">
          Auto-Trade is <strong className={isAutoTradeActive ? "text-green-400" : "text-gray-500"}>
            {isAutoTradeActive ? "ON (Bot will trade automatically)" : "OFF (Manual Mode)"}
          </strong>
        </span>
      </div>
    </div>
  );
}