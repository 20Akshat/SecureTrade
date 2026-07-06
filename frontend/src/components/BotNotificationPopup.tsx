"use client";
import { useState, useEffect, useRef } from "react";
import { useMarket } from "@/context/MarketContext";
import { useAuth } from "@/context/AuthContext";
import { AlertTriangle, TrendingUp, TrendingDown, Play } from "lucide-react";

const LOT_SIZES: Record<string, number> = {
  NIFTY50: 65, BANKNIFTY: 30, SENSEX: 20
};

export default function BotNotificationPopup() {
  const { botNotification, clearNotification, botMaxLots, isZeroHeroActive, triggerTransactionLock } = useMarket();
  const { token, updateBalance, balance } = useAuth();
  const [loading, setLoading] = useState(false);
  const [lots, setLots] = useState(1);
  const [countdown, setCountdown] = useState(3);
  const [paused, setPaused] = useState(false);
  const [popupError, setPopupError] = useState("");

  const handleConfirmRef = useRef<any>(null);
  const pausedRef = useRef(paused);
  const hasAttemptedRef = useRef(false);
  
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    hasAttemptedRef.current = false;
    setPopupError("");
    setLoading(false); // Reset loading state so button shows "Confirm" instead of "⏳..."
  }, [botNotification?.id]);

  useEffect(() => {
    if (botNotification) {
      if (botNotification.action === "SQUARE_OFF") {
        setLots(botNotification.lots || 1);
      } else if (botNotification.action === "BUY_MORE") {
        // Suggested lots for averaging: Match original lots size, capped by botMaxLots
        const originalLots = botNotification.lots || 1;
        setLots(Math.min(originalLots, botMaxLots));
      } else {
        const indexName = Object.keys(LOT_SIZES).find(k => botNotification.symbol.includes(k)) || "NIFTY50";
        const lotSize = LOT_SIZES[indexName];
        const lotCost = botNotification.premium * lotSize;
        if (isZeroHeroActive) {
          const heroLots = lotCost > 0 ? Math.max(1, Math.floor(1500 / lotCost)) : 1;
          setLots(heroLots);
        } else {
          // Regular trade or averaging: dynamically target ₹12,000 capital value and respect botMaxLots
          const calculatedLots = lotCost > 0 ? Math.floor(12000 / lotCost) : 1;
          const finalLots = Math.max(1, Math.min(calculatedLots, botMaxLots));
          setLots(finalLots);
        }
      }
    }
  }, [botNotification, botMaxLots, isZeroHeroActive]);

  useEffect(() => {
    if (botNotification && !loading && !hasAttemptedRef.current) {
      // Require manual confirmation (no auto-confirm countdown) for all actions
      setCountdown(0);
      setPaused(true);
    }
  }, [botNotification?.id, loading]);

  if (!botNotification) return null;

  const indexName = Object.keys(LOT_SIZES).find(k => botNotification.symbol.includes(k)) || "NIFTY50";
  const lotSize = LOT_SIZES[indexName];
  const totalShares = lots * lotSize;
  const totalCost = botNotification.premium * totalShares;
  const lotCost = botNotification.premium * lotSize;
  const targetPct = botNotification.targetPct || (botNotification.symbol.includes("BANKNIFTY") ? 12 : 20);
  const slPct = botNotification.slPct || (botNotification.symbol.includes("BANKNIFTY") ? 10 : 15);

  let suggestedLots = 1;
  if (isZeroHeroActive) {
    suggestedLots = lotCost > 0 ? Math.max(1, Math.floor(1500 / lotCost)) : 1;
  } else {
    suggestedLots = lotCost > 0 ? Math.max(1, Math.floor(15000 / lotCost)) : 1;
  }

  const handleConfirm = async () => {
    if (!token || loading || hasAttemptedRef.current) return;
    hasAttemptedRef.current = true;
    setLoading(true);
    setPaused(true);
    setCountdown(0);
    setPopupError("");
    triggerTransactionLock();
    const action = botNotification.action || "BUY";
    const apiEndpoint = action === "SQUARE_OFF" ? "sell" : "buy";
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second fast timeout
    try {
      const res = await fetch(`https://securetrade-n3qh.onrender.com/api/${apiEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          symbol: botNotification.symbol,
          quantity: totalShares,
          isAutoTrade: true,
          price: botNotification.premium // Pass real premium price!
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      updateBalance(data.newBalance);
      clearNotification(true, lots, data.executedPrice);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        setPopupError("Request timed out! Backend might be paused. Press Enter/Escape in Windows terminal.");
      } else {
        if (err.message && (err.message.includes("Unauthorized") || err.message.includes("expired") || err.message.includes("Token is invalid"))) {
          setLoading(false);
          return;
        }
        setPopupError(err.message || "Execution failed.");
      }
      setLoading(false);
    }
  };

  handleConfirmRef.current = handleConfirm;

  const handleIgnore = () => {
    clearNotification(false);
  };

  const isCE = botNotification.type === "CE";
  const action = botNotification.action || "BUY";
  const isSquareOff = action === "SQUARE_OFF";
  const isBuyMore = action === "BUY_MORE";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
      <div className={`bg-white border rounded-3xl p-6 max-w-sm w-full mx-4 shadow-2xl transition-all border-slate-200`}>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-4 border-b border-slate-100 pb-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${
            isSquareOff ? "bg-amber-100" : isCE ? "bg-green-100" : "bg-red-100"
          }`}>
            {isSquareOff ? (
              <AlertTriangle className="w-6 h-6 text-amber-600 animate-pulse" />
            ) : isCE ? (
              <TrendingUp className="w-6 h-6 text-green-600" />
            ) : (
              <TrendingDown className="w-6 h-6 text-red-600" />
            )}
          </div>
          <div>
            <p className="text-slate-800 font-extrabold text-lg">
              {botNotification.isSureTrade 
                ? "🔥 SURE TRADE (99% SURE)" 
                : (isSquareOff ? "Auto Advisor Exit" : isBuyMore ? "Auto Advisor Average" : "Auto Advisor Signal")}
            </p>
            <p className={`text-xs font-bold uppercase tracking-wider ${
              botNotification.isSureTrade ? "text-amber-500 animate-pulse font-black" : (isSquareOff ? "text-amber-600" : isCE ? "text-green-600" : "text-red-600")
            }`}>
              {botNotification.isSureTrade 
                ? "🏆 100% PROFIT SETUP" 
                : (isSquareOff ? "⚠️ EARLY SQUARE OFF" : isCE ? "📈 BULLISH - Buy CALL" : "📉 BEARISH - Buy PUT")}
            </p>
          </div>
        </div>

        {/* Reason Box */}
        <div className={`rounded-xl p-3 mb-4 border ${
          isSquareOff ? "bg-amber-50/50 border-amber-200 text-amber-800" : isCE ? "bg-green-50/50 border-green-200 text-green-800" : "bg-red-50/50 border-red-200 text-red-800"
        }`}>
          <p className="text-xs font-semibold leading-relaxed">
            {botNotification.reason}
          </p>
        </div>

        {/* Details Card */}
        {/* Details Card */}
        {/* We mask contract details for new entries until they click confirm to prevent copy-trading cheats */}
        {(() => {
          const shouldMask = !isSquareOff && !hasAttemptedRef.current && !loading;
          return (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4 space-y-2.5">
              <div className="flex justify-between items-center text-xs font-medium">
                <span className="text-slate-400 font-bold uppercase">Contract:</span>
                <span className={`font-black transition-all ${
                  shouldMask ? "filter blur-xs select-none text-slate-400" : isCE ? "text-green-600" : "text-red-600"
                }`}>
                  {shouldMask ? `${indexName} XXXXX ${isCE ? "CE" : "PE"}` : botNotification.symbol}
                </span>
              </div>
              
              <div className="flex justify-between items-center text-xs font-medium border-t border-slate-200/50 pt-2">
                <span className="text-slate-400 font-bold uppercase">Premium LTP:</span>
                <span className={`font-black text-sm font-mono transition-all ${
                  shouldMask ? "filter blur-xs select-none text-slate-400" : "text-slate-800"
                }`}>
                  {shouldMask ? "₹XX.XX" : `₹${botNotification.premium.toFixed(2)}`}
                </span>
              </div>
              
              {!isSquareOff ? (
                <>
                  <div className="flex justify-between items-center text-xs font-medium text-green-700">
                    <span className="font-bold uppercase text-slate-400">Target Estimate (+{targetPct}%):</span>
                    <span className={`font-black font-mono transition-all ${shouldMask ? "filter blur-xs select-none text-slate-400" : ""}`}>
                      {shouldMask ? "₹XX.XX" : `₹${(botNotification.premium * (1 + targetPct / 100)).toFixed(2)}`}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs font-medium text-red-600">
                    <span className="font-bold uppercase text-slate-400">Stop Loss Limit (-{slPct}%):</span>
                    <span className={`font-black font-mono transition-all ${shouldMask ? "filter blur-xs select-none text-slate-400" : ""}`}>
                      {shouldMask ? "₹XX.XX" : `₹${(botNotification.premium * (1 - slPct / 100)).toFixed(2)}`}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center text-xs font-medium text-amber-700">
                  <span className="font-bold uppercase text-slate-400">Exit Type:</span>
                  <span className="font-black">Early Exit (Signal Shift)</span>
                </div>
              )}
            </div>
          );
        })()}

        {/* Suggested Lots Sizing Pill */}
        {!isSquareOff && (
          <div className="mb-4 text-[11px] text-slate-500 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 flex justify-between items-center transition-all">
            <span className="flex items-center gap-1">
              💡 <span className="font-bold">Suggested Sizing:</span> <strong className="text-blue-700 font-black">{suggestedLots} Lot{suggestedLots > 1 ? "s" : ""}</strong> (10% Margin)
            </span>
            <button 
              onClick={() => { setLots(suggestedLots); setPaused(true); }}
              className="text-[10px] text-blue-600 hover:text-blue-800 font-extrabold uppercase tracking-wider underline cursor-pointer"
            >
              Apply
            </button>
          </div>
        )}

        {/* Lots selector */}
        <div className="flex items-center gap-3 mb-5 text-xs">
          <span className="text-slate-500 font-bold uppercase">
            {isSquareOff ? "Exit Lots:" : isBuyMore ? "Add Lots:" : "Lots:"}
          </span>
          {!isSquareOff ? (
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              <button 
                onClick={() => { setLots(l => Math.max(1, l - 1)); setPaused(true); }}
                className="px-3.5 py-2 text-slate-600 hover:bg-slate-200 font-bold text-base transition-all"
              >
                −
              </button>
              <span className="px-4 text-slate-800 font-black text-sm font-mono">{lots}</span>
              <button 
                onClick={() => { setLots(l => l + 1); setPaused(true); }}
                className="px-3.5 py-2 text-slate-600 hover:bg-slate-200 font-bold text-base transition-all"
              >
                +
              </button>
            </div>
          ) : (
            <div className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-2 text-slate-800 font-black text-sm font-mono">
              {lots}
            </div>
          )}
          <div className="flex-1 text-right font-medium">
            <p className="text-[10px] text-slate-400">{totalShares} shares</p>
            <p className="text-slate-800 font-extrabold text-sm font-mono">
              {isSquareOff ? "Est. Credit: " : "Est. Cost: "}₹{totalCost.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        {/* Error Display */}
        {popupError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-red-600 text-xs font-bold text-center leading-relaxed">
            ⚠️ {popupError}
          </div>
        )}

        {/* Trigger actions */}
        <div className="grid grid-cols-2 gap-3.5">
          {popupError ? (
            <button
              onClick={handleIgnore}
              className="col-span-2 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer text-center"
            >
              Dismiss Notification
            </button>
          ) : (
            <>
              <button 
                onClick={handleIgnore} 
                disabled={loading}
                className="py-3 border border-slate-250 hover:bg-slate-50 text-slate-600 font-bold rounded-xl transition-all text-xs cursor-pointer"
              >
                ✕ {isSquareOff ? "Hold Position" : "Ignore"}
              </button>
              <button 
                onClick={handleConfirm} 
                disabled={loading}
                className={`py-3 font-extrabold text-xs rounded-xl text-white transition-all uppercase tracking-wider cursor-pointer ${
                  isSquareOff 
                    ? "bg-amber-600 hover:bg-amber-500 shadow-md shadow-amber-250" 
                    : isCE 
                      ? "bg-green-600 hover:bg-green-500 shadow-md shadow-green-200" 
                      : "bg-red-600 hover:bg-red-500 shadow-md shadow-red-200"
                } disabled:opacity-50`}
              >
                {loading ? "⏳..." : (
                  paused ? (isSquareOff ? "Confirm Exit" : isBuyMore ? "Confirm Average" : "Confirm Buy") : (
                    isSquareOff 
                      ? `Confirm Exit (${countdown}s)` 
                      : isBuyMore 
                        ? `Confirm Average (${countdown}s)` 
                        : `Confirm Buy (${countdown}s)`
                  )
                )}
              </button>
            </>
          )}
        </div>

        <p className="text-center text-[10px] text-slate-400 mt-4 leading-normal font-medium">
          ⚡ Click Confirm to execute simulated paper trade or Ignore to reject.
        </p>
      </div>
    </div>
  );
}