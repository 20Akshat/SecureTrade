"use client";
import { useEffect, useState, useRef, memo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useMarket } from "@/context/MarketContext";
import { Play, TrendingUp, AlertCircle, Edit, Trash, X } from "lucide-react";

interface Position { symbol: string; quantity: number; averagePrice: number; livePrice?: number; }
interface Trade { id: string; symbol: string; quantity: number; entryPrice: number; type: 'BUY' | 'SELL'; createdAt: string; pnl?: number; averageBuyPrice?: number; }

const LOT_SIZES: Record<string, number> = { NIFTY50: 65, BANKNIFTY: 30, SENSEX: 20 };
function getLots(symbol: string, quantity: number): number {
  if (!symbol) return 1;
  const underlying = Object.keys(LOT_SIZES).find(k => symbol.includes(k)) || "NIFTY50";
  const lotSize = LOT_SIZES[underlying];
  return Math.round(Math.abs(quantity) / lotSize) || Math.abs(quantity);
}

function isOption(symbol: string): boolean {
  if (!symbol) return false;
  return symbol.includes("CE") || symbol.includes("PE");
}

function parseDteFromSymbol(symbol: string): number {
  if (!symbol) return 1;
  const parts = symbol.trim().split(/\s+/);
  const typeIdx = parts.findIndex(p => p === "CE" || p === "PE");
  if (typeIdx === -1) return 1;
  
  const dateParts = parts.slice(1, typeIdx - 1);
  const dateStr = dateParts.join(" ");
  
  const expiryDate = new Date(dateStr);
  if (isNaN(expiryDate.getTime())) return 1;
  
  expiryDate.setHours(15, 30, 0, 0);
  const today = new Date();
  const diffTime = expiryDate.getTime() - today.getTime();
  const dte = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, dte);
}

export default memo(function PositionsPanel({ onShowChart }: { onShowChart?: (symbol: string) => void }) {
  const { token, updateBalance } = useAuth();
  const { marketData, syncPositionWithDb, isMarketOpen, triggerTransactionLock, activeLimits, setActiveLimits } = useMarket();
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [limitOrders, setLimitOrders] = useState<any[]>([]);
  const [showAllTrades, setShowAllTrades] = useState(false);
  const [activeTab, setActiveTab] = useState<'positions' | 'trades' | 'limit_orders'>('positions');
  const [expandedPos, setExpandedPos] = useState<string | null>(null);
  const [slPrice, setSlPrice] = useState<Record<string, number>>({});
  const [targetPrice, setTargetPrice] = useState<Record<string, number>>({});
  const [sellQty, setSellQty] = useState<Record<string, number>>({});
  const [buyMoreLots, setBuyMoreLots] = useState<Record<string, number>>({});
  const [tradeLoading, setTradeLoading] = useState<string | null>(null);

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const fetchingPosRef = useRef(false);
  const fetchingTradesRef = useRef(false);
  const hasFetchedPosRef = useRef(false);
  const triggeredSymbolsRef = useRef<Record<string, boolean>>({});

  const fetchPositions = async () => {
    if (!token || fetchingPosRef.current) return;
    fetchingPosRef.current = true;
    try {
      const posRes = await fetch("https://securetrade-n3qh.onrender.com/api/portfolio", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (posRes.ok) {
        setPositions(await posRes.json());
        hasFetchedPosRef.current = true;
      }
    } catch {} finally { fetchingPosRef.current = false; }
  };

  const fetchTrades = async () => {
    if (!token || fetchingTradesRef.current) return;
    fetchingTradesRef.current = true;
    try {
      const url = `https://securetrade-n3qh.onrender.com/api/trades${showAllTrades ? '?all=true' : ''}`;
      const tradeRes = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (tradeRes.ok) setTrades(await tradeRes.json());
    } catch {} finally { fetchingTradesRef.current = false; }
  };

  useEffect(() => {
    fetchPositions();
    if (activeTab === 'trades') {
      fetchTrades();
    }
  }, [token, activeTab, showAllTrades]);

  const fetchLimitOrders = async () => {
    if (!token) return;
    try {
      const res = await fetch("https://securetrade-n3qh.onrender.com/api/limit-orders", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setLimitOrders(await res.json());
      }
    } catch {}
  };

  const handleCancelLimit = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this pending limit order?")) return;
    try {
      const res = await fetch(`https://securetrade-n3qh.onrender.com/api/limit-order/${orderId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchLimitOrders();
      }
    } catch {}
  };

  useEffect(() => {
    if (activeTab === 'limit_orders') {
      fetchLimitOrders();
      const interval = setInterval(fetchLimitOrders, 1000);
      return () => clearInterval(interval);
    }
  }, [token, activeTab]);

  useEffect(() => {
    const interval = setInterval(fetchPositions, 250);
    return () => clearInterval(interval);
  }, [token]);


  // Auto-cleanup limit orders for positions that are closed
  useEffect(() => {
    if (!hasFetchedPosRef.current || Object.keys(activeLimits).length === 0) return;
    let changed = false;
    const nextLimits = { ...activeLimits };
    Object.keys(activeLimits).forEach(sym => {
      const hasPos = positions.some(p => p.symbol === sym && Math.abs(p.quantity) > 0 && !p.symbol.startsWith("KYC_CFG"));
      if (!hasPos) {
        delete nextLimits[sym];
        delete triggeredSymbolsRef.current[sym];
        changed = true;
      }
    });
    if (changed) {
      setActiveLimits(nextLimits);
    }
  }, [positions, activeLimits]);

  // Sync positions from DB with bot state
  useEffect(() => {
    syncPositionWithDb(positions);
  }, [positions, syncPositionWithDb]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleSell = async (pos: Position, qty: number, price?: number) => {
    if (!token || tradeLoading) return;
    setTradeLoading(pos.symbol);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const isShort = pos.quantity < 0;
      const apiEndpoint = isShort ? "buy" : "sell";
      const res = await fetch(`https://securetrade-n3qh.onrender.com/api/${apiEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          symbol: pos.symbol, 
          quantity: qty,
          ...(price !== undefined && { price })
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      triggerTransactionLock();
      updateBalance(data.newBalance);
      setExpandedPos(null);

      // Clean up limits if sold manually
      setActiveLimits(prev => {
        const next = { ...prev };
        delete next[pos.symbol];
        return next;
      });

      fetchPositions();
      fetchTrades();
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        alert("❌ Request timed out! Please check if the backend terminal is frozen. Press Enter/Escape in the console to resume.");
      } else {
        if (err.message && (err.message.includes("Unauthorized") || err.message.includes("expired") || err.message.includes("Token is invalid"))) {
          return;
        }
        alert("❌ " + err.message);
      }
    } finally { setTradeLoading(null); }
  };

  const handleAverageMore = async (pos: Position, lotsToBuy: number, price?: number) => {
    if (!token || tradeLoading) return;
    setTradeLoading(pos.symbol);
    const underlying = Object.keys(LOT_SIZES).find(k => pos.symbol.includes(k)) || "NIFTY50";
    const lotSize = LOT_SIZES[underlying];
    const qty = lotsToBuy * lotSize;
    const isBuy = pos.quantity > 0;
    const apiEndpoint = isBuy ? "buy" : "sell";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(`https://securetrade-n3qh.onrender.com/api/${apiEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          symbol: pos.symbol, 
          quantity: qty,
          ...(price !== undefined && { price })
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      triggerTransactionLock();
      updateBalance(data.newBalance);
      setNotification({
        message: `✅ Successfully averaged ${pos.symbol.replace("NIFTY50", "NIFTY")} with ${lotsToBuy} more lot${lotsToBuy > 1 ? 's' : ''}!`,
        type: 'success'
      });
      setExpandedPos(null);
      fetchPositions();
      fetchTrades();
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        alert("❌ Request timed out! Please check if the backend terminal is frozen. Press Enter/Escape in the console to resume.");
      } else {
        if (err.message && (err.message.includes("Unauthorized") || err.message.includes("expired") || err.message.includes("Token is invalid"))) {
          return;
        }
        alert("❌ " + err.message);
      }
    } finally {
      setTradeLoading(null);
    }
  };

  // Monitor active limits and trigger auto execution on target/SL touch
  useEffect(() => {
    if (!isMarketOpen) return; // Do not trigger auto-executions when market is closed!
    if (positions.length === 0 || Object.keys(activeLimits).length === 0) return;

    positions.forEach(pos => {
      const limit = activeLimits[pos.symbol];
      if (!limit) return;

      const ltp = pos.livePrice ?? pos.averagePrice;
      if (!ltp) return;

      const isLong = pos.quantity > 0;
      let triggered = false;
      let reason = "";
      let triggerPrice = ltp;

      if (isLong) {
        if (limit.sl > 0 && ltp <= limit.sl) {
          triggered = true;
          reason = "Stop Loss";
          triggerPrice = limit.sl;
        } else if (limit.target > 0 && ltp >= limit.target) {
          triggered = true;
          reason = "Target";
          triggerPrice = limit.target;
        }
      } else {
        if (limit.sl > 0 && ltp >= limit.sl) {
          triggered = true;
          reason = "Stop Loss";
          triggerPrice = limit.sl;
        } else if (limit.target > 0 && ltp <= limit.target) {
          triggered = true;
          reason = "Target";
          triggerPrice = limit.target;
        }
      }

      if (triggered) {
        // Prevent double execution using ref
        if (triggeredSymbolsRef.current[pos.symbol]) return;
        triggeredSymbolsRef.current[pos.symbol] = true;

        // Clear active limit first to prevent double-execution
        setActiveLimits(prev => {
          const next = { ...prev };
          delete next[pos.symbol];
          return next;
        });

        // Execute sell order
        handleSell(pos, limit.qty, triggerPrice).then(() => {
          setNotification({
            message: `🔔 ${reason} Hit! Auto-executed ${pos.symbol.replace("NIFTY50", "NIFTY")} at ₹${triggerPrice.toFixed(2)} for ${limit.qty} shares.`,
            type: reason === "Target" ? "success" : "error"
          });
        });
      }
    });
  }, [positions, activeLimits]);

  const unrealisedPnl = positions.reduce((acc, pos) => {
    const ltp = pos.livePrice ?? pos.averagePrice;
    return acc + (pos.quantity * (ltp - pos.averagePrice));
  }, 0);

  const realisedPnl = trades.reduce((acc, t) => acc + (t.pnl || 0), 0);

  const overallPnl = unrealisedPnl + realisedPnl;
  const totalLots = positions.reduce((acc, pos) => acc + getLots(pos.symbol, pos.quantity), 0);

  return (
    <div id="positions-panel" className="relative">
      {/* Real-time Notification banner */}
      {notification && (
        <div className={`p-4 mb-4 rounded-xl border flex justify-between items-center animate-bounce shadow-md z-30 ${
          notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 
          notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-base">
              {notification.type === 'success' ? '🏆' : notification.type === 'error' ? '🚨' : 'ℹ️'}
            </span>
            <p className="text-xs font-black uppercase tracking-wider">{notification.message}</p>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="text-xs font-bold underline ml-4 hover:text-opacity-80 cursor-pointer"
          >
            DISMISS
          </button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-8">

        {/* Tabs Menu */}
        <div className="flex border-b border-slate-200 bg-slate-50/50">
          <button 
            onClick={() => setActiveTab('positions')}
            className={`flex-1 py-3 text-xs font-black tracking-wider transition-all border-b-2 text-center uppercase cursor-pointer ${
              activeTab === 'positions' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-450 hover:text-slate-700'
            }`}
          >
            Positions ({positions.length})
          </button>
          <button 
            onClick={() => setActiveTab('limit_orders')}
            className={`flex-1 py-3 text-xs font-black tracking-wider transition-all border-b-2 text-center uppercase cursor-pointer ${
              activeTab === 'limit_orders' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-455 hover:text-slate-700'
            }`}
          >
            Pending Limits ({limitOrders.length})
          </button>
          <button 
            onClick={() => setActiveTab('trades')}
            className={`flex-1 py-3 text-xs font-black tracking-wider transition-all border-b-2 text-center uppercase cursor-pointer ${
              activeTab === 'trades' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-450 hover:text-slate-700'
            }`}
          >
            Order History ({trades.length})
          </button>
        </div>

        <div className="p-4">

          {/* ── POSITIONS TAB ── */}
          {activeTab === 'positions' && (
            <>
              {/* SecureTrade style P&L Header Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Overall P&L</span>
                  <span className="text-[9px] text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full font-bold">TODAY</span>
                </div>
                
                <div className="flex items-baseline justify-between">
                  <h2 className={`text-3xl font-black font-mono leading-none transition-all duration-500 ease-out ${overallPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {overallPnl >= 0 ? '+' : ''}₹{overallPnl.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h2>
                </div>
                
                <div className="grid grid-cols-2 gap-4 border-t border-slate-200/60 mt-3 pt-2 text-xs font-semibold">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block mb-0.5">REALISED P&L</span>
                    <span className={`font-mono font-bold text-sm transition-all duration-500 ease-out ${realisedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{realisedPnl.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold block mb-0.5">UNREALISED P&L</span>
                    <span className={`font-mono font-bold text-sm transition-all duration-500 ease-out ${unrealisedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{unrealisedPnl.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Positions List */}
              <div className="space-y-3.5">
                {positions.filter(p => !p.symbol.startsWith("KYC_CFG")).length === 0 ? (
                  <div className="text-center py-10">
                    <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-400 text-xs font-bold uppercase">No Open Positions</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Create buy/sell orders in the Options Chain tab.</p>
                  </div>
                ) : positions.filter(p => !p.symbol.startsWith("KYC_CFG")).map((pos) => {
                  const ltp = pos.livePrice ?? pos.averagePrice;
                  const pnl = pos.quantity * (ltp - pos.averagePrice);
                  const isProfit = pnl >= 0;
                  const lots = getLots(pos.symbol, pos.quantity);
                  const opt = isOption(pos.symbol);
                  const pnlPct = pos.averagePrice > 0 ? (pnl / (Math.abs(pos.quantity) * pos.averagePrice)) * 100 : 0;
                  const isExpanded = expandedPos === pos.symbol;
                  
                  const currentSellQty = sellQty[pos.symbol] ?? Math.abs(pos.quantity);
                  const isBN = pos.symbol.includes("BANKNIFTY");
                  const defaultSlPct = isBN ? 0.85 : 0.85; // 15% Stop Loss default
                  const defaultTgtPct = isBN ? 1.25 : 1.20; // 25% Target for BANKNIFTY, 20% for NIFTY/others
                  const currentSL = slPrice[pos.symbol] ?? parseFloat((pos.averagePrice * defaultSlPct).toFixed(2));
                  const currentTarget = targetPrice[pos.symbol] ?? parseFloat((pos.averagePrice * defaultTgtPct).toFixed(2));

                  // Calculate Target Hit Probability
                  const dte = parseDteFromSymbol(pos.symbol);
                  const underlying = Object.keys(LOT_SIZES).find(k => pos.symbol.includes(k)) || "NIFTY50";
                  const indexData = marketData[underlying];
                  const rsi = indexData?.rsi ?? 50;
                  const isLong = pos.quantity > 0;
                  let targetProb = 50;

                  if (isLong) {
                    if (ltp >= currentTarget) {
                      targetProb = 100;
                    } else {
                      const distancePct = (currentTarget - ltp) / ltp;
                      const timeScaledDistance = distancePct / Math.sqrt(dte);
                      const distanceFactor = Math.exp(-timeScaledDistance * 5.5);
                      let rsiFactor = 0;
                      if (pos.symbol.includes("CE")) {
                        rsiFactor = (rsi - 50) * 0.35;
                      } else if (pos.symbol.includes("PE")) {
                        rsiFactor = (50 - rsi) * 0.35;
                      }
                      targetProb = Math.max(5, Math.min(95, Math.round((distanceFactor * 100) + rsiFactor)));
                    }
                  } else {
                    if (ltp <= currentTarget) {
                      targetProb = 100;
                    } else {
                      const distancePct = (ltp - currentTarget) / ltp;
                      const timeScaledDistance = distancePct / Math.sqrt(dte);
                      const distanceFactor = Math.exp(-timeScaledDistance * 5.5);
                      let rsiFactor = 0;
                      if (pos.symbol.includes("CE")) {
                        rsiFactor = (50 - rsi) * 0.35;
                      } else if (pos.symbol.includes("PE")) {
                        rsiFactor = (rsi - 50) * 0.35;
                      }
                      targetProb = Math.max(5, Math.min(95, Math.round((distanceFactor * 100) + rsiFactor)));
                    }
                  }

                  return (
                    <div key={pos.symbol} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:border-slate-355 transition-all">

                      {/* Main Row (Clickable to toggle expansion) */}
                      <div className="p-3.5 cursor-pointer select-none" onClick={() => setExpandedPos(isExpanded ? null : pos.symbol)}>
                        <div className="flex justify-between items-start">
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                              <span className={`text-[8px] px-1.5 py-0.2 rounded font-black ${
                                opt ? 'bg-blue-150 text-blue-750' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {opt ? "F&O" : "INDEX"}
                              </span>
                              <span className="text-slate-800 font-black text-base truncate block leading-none">
                                {pos.symbol.replace("NIFTY50", "NIFTY")}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                                pos.quantity > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {pos.quantity > 0 ? 'BUY' : 'SELL'}
                              </span>
                              <span className="text-xs text-slate-500 font-bold">
                                {lots} Lot{lots > 1 ? 's' : ''} ({Math.abs(pos.quantity)} Qty) · NRML
                              </span>
                              {activeLimits[pos.symbol] && (
                                <div className="flex items-center gap-1.5 ml-2">
                                  <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-black animate-pulse uppercase tracking-wider flex items-center gap-1">
                                    ⚡ ACTIVE ORDER · SL: ₹{activeLimits[pos.symbol].sl.toFixed(2)} | Tgt: ₹{activeLimits[pos.symbol].target.toFixed(2)}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveLimits(prev => {
                                        const next = { ...prev };
                                        delete next[pos.symbol];
                                        return next;
                                      });
                                      setNotification({
                                        message: `❌ Cancelled SL & Target order for ${pos.symbol}`,
                                        type: 'info'
                                      });
                                    }}
                                    className="text-[9px] text-red-500 hover:text-red-700 font-bold underline cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase leading-none mb-1.5">
                              AVG PRICE: <span className="font-mono text-slate-600 text-xs">₹{pos.averagePrice.toFixed(2)}</span>
                            </p>
                            
                            {((pos as any).high !== undefined || (pos as any).low !== undefined) && (
                              <div className="flex gap-3 text-[9.5px] text-slate-450 font-black uppercase tracking-wider mt-2 flex-wrap">
                                <span>High: <span className="font-mono text-green-600 font-extrabold">₹{((pos as any).high || 0).toFixed(2)}</span></span>
                                <span className="text-slate-300">|</span>
                                <span>Low: <span className="font-mono text-red-500 font-extrabold">₹{((pos as any).low || 0).toFixed(2)}</span></span>
                                <span className="text-slate-300">|</span>
                                <span>Prev Close: <span className="font-mono text-slate-600 font-extrabold">₹{((pos as any).close || 0).toFixed(2)}</span></span>
                              </div>
                            )}
                          </div>
                          
                          {/* Real-time P&L Display */}
                          <div className="text-right shrink-0 ml-2">
                            <p className={`font-black text-lg font-mono leading-none mb-1.5 transition-all duration-500 ease-out ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                              {isProfit ? '+' : ''}₹{pnl.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-[10px] text-slate-450 font-bold uppercase mb-0.5 transition-all duration-300">
                              LTP: <span className="font-mono text-slate-700 text-xs">₹{ltp.toFixed(2)}</span>
                            </p>
                            <span className={`text-[11px] font-black font-mono transition-all duration-500 ease-out ${isProfit ? 'text-green-600' : 'text-red-655'}`}>
                              {isProfit ? '+' : ''}{pnlPct.toFixed(2)}%
                            </span>
                          </div>
                          
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 mt-3.5 border-t border-slate-100 pt-3 flex-wrap">
                          {onShowChart && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onShowChart(pos.symbol); }}
                              className="py-1.5 px-3 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-blue-650 text-xs font-bold rounded-lg transition-all"
                              title="View Contract Chart"
                            >
                              📈 Chart
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpandedPos(isExpanded ? null : pos.symbol); }}
                            className="flex-1 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"
                          >
                            <Edit className="w-3.5 h-3.5 text-slate-455" />
                            Edit SL / Target
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSell(pos, Math.abs(pos.quantity), pos.livePrice || pos.averagePrice); }}
                            disabled={tradeLoading === pos.symbol}
                            className="flex-1 py-1.5 bg-red-605 hover:bg-red-500 text-white text-xs font-black rounded-lg transition-all disabled:opacity-50 tracking-wide flex items-center justify-center gap-1.5"
                          >
                            <Trash className="w-3.5 h-3.5 text-white/80" />
                            {tradeLoading === pos.symbol ? "⏳" : "SQUARE OFF"}
                          </button>
                        </div>
                      </div>

                      {/* Expandable stop loss and target manager */}
                      {isExpanded && (
                        <div className="border-t border-slate-200 bg-slate-50/50 p-4 space-y-4">
                          
                          {/* Live Market Stats Panel */}
                          <div className="space-y-1.5">
                            <p className="text-slate-800 font-black text-xs uppercase tracking-wider">📊 Live Market Contract Rates</p>
                            <div className="grid grid-cols-4 gap-2 bg-white border border-slate-200 rounded-xl p-3 text-center text-xs font-semibold text-slate-700 shadow-3xs">
                              <div>
                                <span className="text-[9px] text-slate-400 font-bold block uppercase mb-0.5">LTP</span>
                                <span className="font-mono font-black text-blue-655 font-bold">₹{ltp.toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 font-bold block uppercase mb-0.5">High</span>
                                <span className="font-mono font-black text-green-600 font-bold">₹{((pos as any).high || 0).toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 font-bold block uppercase mb-0.5">Low</span>
                                <span className="font-mono font-black text-red-500 font-bold">₹{((pos as any).low || 0).toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 font-bold block uppercase mb-0.5">Prev Close</span>
                                <span className="font-mono font-black text-slate-500 font-bold">₹{((pos as any).close || 0).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Average More / Buy More Option */}
                          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-3xs space-y-3">
                            <div className="flex items-center gap-1.5 text-blue-600">
                              <Play className="w-4 h-4 text-blue-600 rotate-90" />
                              <span className="text-[10px] font-black uppercase tracking-wider">
                                {pos.quantity > 0 ? "🛒 Buy More (Average Position)" : "📈 Sell More (Short Average)"}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span className="text-slate-500 font-bold">Additional Lots</span>
                              <div className="flex items-center bg-slate-105 border border-slate-200 rounded-lg overflow-hidden shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBuyMoreLots(l => ({ ...l, [pos.symbol]: Math.max(1, (l[pos.symbol] || 1) - 1) }));
                                  }}
                                  className="px-2.5 py-1 text-slate-600 hover:bg-slate-200 font-bold text-sm"
                                >
                                  −
                                </button>
                                <span className="px-3 text-slate-800 font-black text-sm font-mono">{(buyMoreLots[pos.symbol] || 1)}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBuyMoreLots(l => ({ ...l, [pos.symbol]: (l[pos.symbol] || 1) + 1 }));
                                  }}
                                  className="px-2.5 py-1 text-slate-600 hover:bg-slate-200 font-bold text-sm"
                                >
                                  +
                                </button>
                              </div>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const lotsToBuy = buyMoreLots[pos.symbol] || 1;
                                  handleAverageMore(pos, lotsToBuy, pos.livePrice || pos.averagePrice); // Pass real-time LTP!
                                }}
                                disabled={tradeLoading === pos.symbol}
                                className="py-1.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg transition-all disabled:opacity-50 text-center uppercase tracking-wide cursor-pointer shadow-xs"
                              >
                                {tradeLoading === pos.symbol ? "⏳..." : (
                                  pos.quantity > 0 
                                    ? `Buy ${(buyMoreLots[pos.symbol] || 1)} Lot${(buyMoreLots[pos.symbol] || 1) > 1 ? 's' : ''}`
                                    : `Sell ${(buyMoreLots[pos.symbol] || 1)} Lot${(buyMoreLots[pos.symbol] || 1) > 1 ? 's' : ''}`
                                )}
                              </button>
                            </div>
                          </div>

                          {/* stop loss and target limits section */}
                          <div className="space-y-3.5 border-t border-slate-200/60 pt-3.5">
                            <div className="flex justify-between items-center">
                              <p className="text-slate-800 font-black text-xs uppercase tracking-wider">📐 Set SL & Target Limits</p>
                              <button onClick={() => setExpandedPos(null)} className="text-slate-455 hover:text-slate-700">
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                          {/* Adjust exit share quantity */}
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-slate-500">Exit Quantity (shares)</span>
                            <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden">
                              <button
                                onClick={() => setSellQty(q => ({ ...q, [pos.symbol]: Math.max(1, (q[pos.symbol] ?? Math.abs(pos.quantity)) - 1) }))}
                                className="px-2.5 py-1 text-slate-550 hover:bg-slate-100 font-bold"
                              >
                                −
                              </button>
                              <span className="px-3 text-slate-700 font-black text-sm">{currentSellQty}</span>
                              <button
                                onClick={() => setSellQty(q => ({ ...q, [pos.symbol]: Math.min(Math.abs(pos.quantity), (q[pos.symbol] ?? Math.abs(pos.quantity)) + 1) }))}
                                className="px-2.5 py-1 text-slate-555 hover:bg-slate-100 font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Limit Price Input Fields */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-red-600 text-[10px] font-black uppercase block mb-1">🛑 Stop Loss Limit</span>
                              <input
                                type="number"
                                step="0.05"
                                value={currentSL}
                                onChange={e => setSlPrice(s => ({ ...s, [pos.symbol]: Number(e.target.value) }))}
                                className="w-full bg-white border border-red-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-lg px-2.5 py-1.5 text-slate-800 text-left text-xs font-mono font-bold focus:outline-none" 
                              />
                            </div>
                            <div>
                              <span className="text-green-600 text-[10px] font-black uppercase block mb-1">🎯 Target Limit</span>
                              <input
                                type="number"
                                step="0.05"
                                value={currentTarget}
                                onChange={e => setTargetPrice(t => ({ ...t, [pos.symbol]: Number(e.target.value) }))}
                                className="w-full bg-white border border-green-200 focus:border-green-500 focus:ring-1 focus:ring-green-500 rounded-lg px-2.5 py-1.5 text-slate-800 text-left text-xs font-mono font-bold focus:outline-none" 
                              />
                            </div>
                          </div>

                          {/* Estimated Risk / Reward Preview */}
                          <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-[11px] space-y-1 bg-opacity-70">
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-bold">LTP Estimate:</span>
                              <span className="text-slate-700 font-black font-mono">₹{ltp.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-red-500 font-bold">Estimated Loss (at SL):</span>
                              <span className="text-red-655 font-black font-mono">-₹{(currentSellQty * Math.abs(pos.averagePrice - currentSL)).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-green-600 font-bold">Estimated Profit (at Target):</span>
                              <span className="text-green-600 font-black font-mono">+₹{(currentSellQty * Math.abs(currentTarget - pos.averagePrice)).toFixed(2)}</span>
                            </div>
                          </div>

                          {/* Target Hit Probability Gauge */}
                          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-3xs space-y-2">
                            <div className="flex justify-between items-center text-xs font-bold">
                              <span className="text-slate-500 uppercase flex items-center gap-1">
                                🎯 Target Hit Probability
                              </span>
                              <span className={`font-mono font-black ${
                                targetProb >= 75 ? "text-green-600" : targetProb >= 45 ? "text-blue-600" : "text-amber-600"
                              }`}>
                                {targetProb}%
                              </span>
                            </div>
                            
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  targetProb >= 75 ? "bg-gradient-to-r from-green-500 to-emerald-600" : 
                                  targetProb >= 45 ? "bg-gradient-to-r from-blue-500 to-indigo-600" : 
                                  "bg-gradient-to-r from-amber-500 to-orange-600"
                                }`} 
                                style={{ width: `${targetProb}%` }}
                              />
                            </div>
                            
                            <p className="text-[10px] text-slate-450 font-semibold leading-relaxed">
                              {targetProb >= 100 ? "🎉 Target reached or exceeded!" :
                               targetProb >= 75 ? "🔥 Strong momentum alignment. High probability of hitting target." :
                               targetProb >= 45 ? "📈 Moderate momentum bias. Price action remains constructive." :
                               "⚠️ Distance is high or momentum is weak. Tighten stop loss to protect premium."}
                            </p>
                          </div>

                          {/* Trigger order execution */}
                          <div className="space-y-2">
                            <button
                              onClick={() => {
                                setActiveLimits(prev => ({
                                  ...prev,
                                  [pos.symbol]: { sl: currentSL, target: currentTarget, qty: currentSellQty, targetActive: true }
                                }));
                                setNotification({
                                  message: `⚡ SL & Target order placed for ${pos.symbol.replace("NIFTY50", "NIFTY")} (SL: ₹${currentSL.toFixed(2)} | Target: ₹${currentTarget.toFixed(2)})`,
                                  type: 'success'
                                });
                                setExpandedPos(null);
                              }}
                              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg transition-all text-center uppercase tracking-wider cursor-pointer"
                            >
                              🔒 Activate SL & Target Order
                            </button>
                            
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => handleSell(pos, currentSellQty, currentSL)}
                                disabled={tradeLoading === pos.symbol}
                                className="py-1.5 bg-red-100 hover:bg-red-200 text-red-750 text-[10px] font-black rounded-lg transition-all disabled:opacity-50 text-center uppercase"
                              >
                                Exit @ SL ₹{currentSL.toFixed(2)}
                              </button>
                              <button
                                onClick={() => handleSell(pos, currentSellQty, currentTarget)}
                                disabled={tradeLoading === pos.symbol}
                                className="py-1.5 bg-green-100 hover:bg-green-200 text-green-750 text-[10px] font-black rounded-lg transition-all disabled:opacity-50 text-center uppercase"
                              >
                                Exit @ Target ₹{currentTarget.toFixed(2)}
                              </button>
                            </div>
                          </div>
                        </div>

                      </div>
                    )}
                    </div>
                  );
                })}
              </div>

              {/* Summary Footer */}
              {positions.length > 0 && (
                <div className="flex justify-between items-center mt-5 pt-4 border-t border-slate-200">
                  <p className="text-slate-400 text-xs font-bold uppercase">Total Lots: <span className="text-slate-700 font-black font-mono text-sm">{totalLots}</span></p>
                  <p className={`font-black text-lg font-mono transition-all duration-500 ease-out ${overallPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {overallPnl >= 0 ? '+' : ''}₹{overallPnl.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── PENDING LIMIT ORDERS TAB ── */}
          {activeTab === 'limit_orders' && (
            <div className="space-y-3.5">
              {limitOrders.length === 0 ? (
                <div className="text-center py-10">
                  <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-455 text-xs font-bold uppercase">
                    No Pending Limit Orders
                  </p>
                </div>
              ) : (
                limitOrders.map((order) => {
                  const isBuy = order.action === "buy";
                  const lotsVal = getLots(order.symbol, order.quantity);
                  const time = new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

                  return (
                    <div key={order.id} className="bg-white border border-slate-150 rounded-xl p-3.5 shadow-xs flex justify-between items-center hover:bg-slate-50/50 transition-all">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md text-white uppercase tracking-wider ${
                            isBuy ? 'bg-green-600' : 'bg-red-655'
                          }`}>
                            LIMIT {order.action.toUpperCase()}
                          </span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            order.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-650'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="font-black text-slate-800 text-sm truncate">
                          {order.symbol.replace("NIFTY50", "NIFTY")}
                        </p>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mt-1">
                          <span>Lots: <span className="font-mono font-bold text-slate-700">{lotsVal}</span> ({order.quantity} Qty)</span>
                          <span className="text-slate-300">·</span>
                          <span>Limit Price: <span className="font-mono font-bold text-slate-700">₹{order.price.toFixed(2)}</span></span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-bold block mt-1">
                          Placed at {time}
                        </span>
                      </div>

                      <div className="shrink-0 ml-4">
                        {order.status === "pending" && (
                          <button
                            onClick={() => handleCancelLimit(order.id)}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[10px] rounded-lg tracking-wider uppercase transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
          {activeTab === 'trades' && (
            <div className="space-y-3.5">
              {/* Toggle to view Today's Trades vs All History */}
              <div className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-xl p-3 mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Trade History Mode</span>
                <div className="flex bg-slate-200/80 p-0.5 rounded-lg">
                  <button
                    onClick={() => setShowAllTrades(false)}
                    className={`px-3 py-1 text-[10px] font-black rounded-md uppercase tracking-wider transition-all cursor-pointer ${
                      !showAllTrades 
                        ? 'bg-white text-blue-650 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setShowAllTrades(true)}
                    className={`px-3 py-1 text-[10px] font-black rounded-md uppercase tracking-wider transition-all cursor-pointer ${
                      showAllTrades 
                        ? 'bg-white text-blue-650 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    All History
                  </button>
                </div>
              </div>

              {trades.length === 0 ? (
                <div className="text-center py-10">
                  <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-455 text-xs font-bold uppercase">
                    {showAllTrades ? "No trades in account history" : "No Trades Executed Today"}
                  </p>
                </div>
              ) : trades.map((trade) => {
                const dateStr = trade.createdAt.endsWith('Z') || trade.createdAt.includes('+') ? trade.createdAt : `${trade.createdAt}Z`;
                const time = new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
                const date = new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                const lots = getLots(trade.symbol, trade.quantity);
                const isBuy = trade.type === 'BUY';
                
                // Value to display on the right
                const orderValue = Math.abs(trade.quantity) * trade.entryPrice;
                const pnl = trade.pnl ?? 0;
                const isValuePositive = pnl >= 0;

                return (
                  <div key={trade.id} className="bg-white border border-slate-150 rounded-xl p-3.5 shadow-xs flex justify-between items-center hover:bg-slate-50/50 transition-all">
                    
                    {/* Left Side: Trade Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md text-white uppercase tracking-wider ${
                          isBuy ? 'bg-green-600' : 'bg-red-600'
                        }`}>
                          {trade.type}
                        </span>
                        <p className="font-black text-slate-800 text-sm truncate leading-none">
                          {trade.symbol.replace("NIFTY50", "NIFTY")}
                        </p>
                      </div>
                      
                      <p className="text-xs text-slate-400 font-bold mb-1.5 uppercase tracking-wide">
                        NFO · NRML
                      </p>
                      
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <span>Lot: <span className="font-mono font-bold text-slate-700">{lots}</span> ({Math.abs(trade.quantity)} Qty)</span>
                        <span className="text-slate-300">·</span>
                        <span>Avg: <span className="font-mono font-bold text-slate-700">₹{trade.entryPrice.toFixed(2)}</span></span>
                      </div>
                    </div>
                    
                    {/* Right Side: Status and Value */}
                    <div className="text-right shrink-0 ml-4 flex flex-col justify-between h-full">
                      <span className="text-[10px] text-green-600 font-black uppercase tracking-wider block mb-0.5">
                        COMPLETE
                      </span>
                      <span className="text-xs font-bold text-slate-500 block mb-0.5">
                        Value: <span className="font-mono text-slate-700">₹{orderValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </span>
                      {trade.pnl !== undefined && trade.pnl !== 0 && (
                        <span className={`text-xs font-black font-mono block mb-1.5 ${
                          isValuePositive ? 'text-green-600' : 'text-red-600'
                        }`}>
                          PnL: {pnl >= 0 ? '+' : '-'}₹{Math.abs(pnl).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                      <span className="text-[9px] text-slate-400 font-bold block">
                        {time} · {date}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});