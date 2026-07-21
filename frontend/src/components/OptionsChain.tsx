"use client";
import { useState, useMemo, useRef, useEffect, memo } from "react";
import { useMarket } from "@/context/MarketContext";
import { useAuth } from "@/context/AuthContext";
import { Search, ChevronDown, Award } from "lucide-react";

const SYMBOL_CONFIG: Record<string, { step: number; lotSize: number; iv: number }> = {
  NIFTY50:   { step: 50,  lotSize: 65,  iv: 0.13 },
  BANKNIFTY: { step: 100, lotSize: 30,  iv: 0.16 },
  SENSEX:    { step: 100, lotSize: 20,  iv: 0.13 },
};

function getLastTuesdayOfMonth(year: number, month: number): Date {
  const date = new Date(year, month + 1, 0); // Last day of month
  const day = date.getDay();
  const diff = (day - 2 + 7) % 7;
  date.setDate(date.getDate() - diff);
  date.setHours(15, 30, 0, 0);
  return date;
}

function getBankNiftyExpiries(): { label: string; dte: number; type: "W" | "M" }[] {
  const today = new Date();
  const expiries = [];
  let currentMonth = today.getMonth();
  let currentYear = today.getFullYear();
  
  for (let i = 0; i < 4; i++) {
    let lastTuesday = getLastTuesdayOfMonth(currentYear, currentMonth);
    const isToday = today.getDate() === lastTuesday.getDate() && today.getMonth() === lastTuesday.getMonth();
    const isPastCutoff = isToday && (today.getHours() * 100 + today.getMinutes() > 1530);
    
    if (today.getTime() > lastTuesday.getTime() || isPastCutoff) {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      lastTuesday = getLastTuesdayOfMonth(currentYear, currentMonth);
    }
    
    const diffTime = lastTuesday.getTime() - today.getTime();
    const dte = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const label = lastTuesday.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }).toUpperCase();
    
    expiries.push({
      label,
      dte,
      type: "M" as const
    });
    
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
  }
  return expiries;
}

function getWeeklyExpiries(symbol: string): { label: string; dte: number; type: "W" | "M" }[] {
  const today = new Date();
  const day = today.getDay();
  const targetDay = symbol === "SENSEX" ? 5 : (symbol === "BANKNIFTY" ? 3 : 2); // SENSEX=Friday(5), BANKNIFTY=Wednesday(3), NIFTY50=Tuesday(2)
  
  const expiries = [];
  const diff = targetDay - day;
  const daysToFirst = diff < 0 ? diff + 7 : diff;
  
  let startOffset = 0;
  if (diff === 0) {
    const hours = today.getHours();
    const minutes = today.getMinutes();
    if (hours * 100 + minutes > 1530) {
      startOffset = 7;
    }
  }

  for (let i = 0; i < 4; i++) {
    const daysTo = daysToFirst + i * 7 + startOffset;
    const expiry = new Date(today);
    expiry.setDate(today.getDate() + daysTo);
    const label = expiry.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }).toUpperCase();
    
    // Monthly checking: if next week goes to new month, it is monthly expiry
    const nextWeek = new Date(expiry);
    nextWeek.setDate(expiry.getDate() + 7);
    const isMonthly = nextWeek.getMonth() !== expiry.getMonth();
    
    let dteVal = daysTo;
    if (daysTo === 0) {
      const expiryTime = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate(), 15, 30, 0);
      const diffMs = expiryTime.getTime() - today.getTime();
      dteVal = diffMs > 0 ? (diffMs / (1000 * 60 * 60 * 24)) : 0.001;
    }

    expiries.push({
      label,
      dte: Math.max(0.001, dteVal),
      type: isMonthly ? ("M" as const) : ("W" as const)
    });
  }
  return expiries;
}

function getExpiryDates(symbol: string): { label: string; dte: number; type: "W" | "M" }[] {
  if (symbol === "BANKNIFTY") {
    return getBankNiftyExpiries();
  }
  return getWeeklyExpiries(symbol);
}

// Standard Normal Cumulative Distribution Function approximation
const stdNormalCDF = (x: number): number => {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (x > 0) return 1 - prob;
  return prob;
};

function calcPremium(spot: number, strike: number, dte: number, isCall: boolean, iv: number): number {
  const T = Math.max(dte, 0.001) / 365;
  const sigma = iv;
  const r = 0.07; // 7% risk-free interest rate in India
  
  const d1 = (Math.log(spot / strike) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  
  const Nd1 = stdNormalCDF(d1);
  const Nd2 = stdNormalCDF(d2);
  const N_d1 = stdNormalCDF(-d1);
  const N_d2 = stdNormalCDF(-d2);
  
  const discount = Math.exp(-r * T);
  
  const premium = isCall 
    ? (spot * Nd1 - strike * discount * Nd2) 
    : (strike * discount * N_d2 - spot * N_d1);
    
  return Math.max(0.05, Math.round(premium * 20) / 20);
}

const SYMBOLS = ["NIFTY50", "SENSEX", "BANKNIFTY"];

export default memo(function OptionsChain({ onShowChart }: { onShowChart?: (symbol: string) => void }) {
  const { marketData, selectedSymbol, setSelectedSymbol, triggerTransactionLock } = useMarket();
  const { token, balance, updateBalance } = useAuth();
  const [selected, setSelected] = useState<{ strike: number; type: "CE" | "PE"; premium: number } | null>(null);
  const [selectedLtpDetails, setSelectedLtpDetails] = useState<{ ltp: number; high: number; low: number; close: number } | null>(null);
  const [lots, setLots] = useState(1);
  const [loading, setLoading] = useState(false);
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [limitPrice, setLimitPrice] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"LTP" | "OI">("LTP");
  const [searchQuery, setSearchQuery] = useState("");
  const [liveQuotes, setLiveQuotes] = useState<Record<number, { CE: number | null; PE: number | null }>>({});

  const expiryDates = useMemo(() => getExpiryDates(selectedSymbol), [selectedSymbol]);
  const [selectedExpiryIdx, setSelectedExpiryIdx] = useState(0);
  const { label: expiryLabel, dte } = expiryDates[selectedExpiryIdx] || expiryDates[0];

  const orderRef = useRef<HTMLDivElement>(null);
  const submittingRef = useRef(false);

  const searchNumberMatch = searchQuery.trim().match(/\d+/);
  const searchedStrikeVal = searchNumberMatch ? parseInt(searchNumberMatch[0]) : null;

  const spot = marketData[selectedSymbol]?.price || 0;
  const config = SYMBOL_CONFIG[selectedSymbol] || SYMBOL_CONFIG.NIFTY50;
  const atm = (searchedStrikeVal && searchedStrikeVal > 1000)
    ? Math.round(searchedStrikeVal / config.step) * config.step
    : (spot ? Math.round(spot / config.step) * config.step : 0);

  // Real-time smart search parser: auto-switches underlying index based on keyword or numeric values
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    const cleanQuery = query.trim().toUpperCase();
    if (!cleanQuery) return;
    
    // 1. Text keyword search matches
    if (cleanQuery.includes("NIFTY50") || cleanQuery.includes("NIFTY")) {
      setSelectedSymbol("NIFTY50");
      setSelected(null);
    } else if (cleanQuery.includes("SENSEX")) {
      setSelectedSymbol("SENSEX");
      setSelected(null);
    } else if (cleanQuery.includes("BANKNIFTY") || cleanQuery.includes("BANK") || cleanQuery.includes("BANK NIFTY")) {
      setSelectedSymbol("BANKNIFTY");
      setSelected(null);
    } 
    // 2. If query contains a number, auto-switch based on standard Indian Index values
    else {
      const numMatch = cleanQuery.match(/\d+/);
      if (numMatch) {
        const parsedNum = parseInt(numMatch[0]);
        if (parsedNum >= 70000) {
          setSelectedSymbol("SENSEX");
          setSelected(null);
        } else if (parsedNum >= 40000 && parsedNum < 70000) {
          setSelectedSymbol("BANKNIFTY");
          setSelected(null);
        } else if (parsedNum > 0 && parsedNum < 35000) {
          setSelectedSymbol("NIFTY50");
          setSelected(null);
        }
      }
    }
  };

  const visibleStrikes = useMemo(() => {
    if (!spot || !atm) return [];
    const totalStrikes = 41;
    const allStrikes = Array.from({ length: totalStrikes }, (_, i) => atm + (i - 20) * config.step);
    
    if (!searchQuery.trim()) {
      return allStrikes.slice(10, 31);
    }
    
    const numericMatch = searchQuery.match(/\d+/);
    if (numericMatch) {
      const strikeFilter = numericMatch[0];
      const parsedNum = parseInt(strikeFilter);
      if (parsedNum > 1000) {
        return allStrikes.slice(10, 31);
      }
      const filtered = allStrikes.filter(strike => strike.toString().includes(strikeFilter));
      return filtered.slice(0, 21);
    }
    
    return allStrikes.slice(10, 31);
  }, [spot, atm, config.step, searchQuery]);

  const visibleStrikesKey = useMemo(() => JSON.stringify(visibleStrikes), [visibleStrikes]);

  useEffect(() => {
    const strikesArray = JSON.parse(visibleStrikesKey);
    if (strikesArray.length === 0) return;
    
    let active = true;
    let isFetching = false;
    const fetchQuotes = async () => {
      if (isFetching) return;
      isFetching = true;
      try {
        const res = await fetch("https://securetrade-n3qh.onrender.com/api/options-chain/quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            underlying: selectedSymbol,
            expiryLabel,
            strikes: strikesArray
          })
        });
        if (!res.ok) return;
        const data = await res.json();
        if (active && data.quotes) {
          setLiveQuotes(prev => ({ ...prev, ...data.quotes }));
        }
      } catch {
        // Backend offline — silently retry
      } finally { isFetching = false; }
    };
    
    fetchQuotes();
    const interval = setInterval(fetchQuotes, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedSymbol, expiryLabel, visibleStrikesKey]);

  useEffect(() => {
    if (!selected) {
      setSelectedLtpDetails(null);
      return;
    }

    let active = true;
    let isFetching = false;
    const fetchLtp = async () => {
      if (isFetching) return;
      isFetching = true;
      try {
        const symbol = `${selectedSymbol} ${expiryLabel} ${selected.strike} ${selected.type}`;
        const res = await fetch("https://securetrade-n3qh.onrender.com/api/option-ltp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol })
        });
        if (!res.ok) return;
        const data = await res.json();
        if (active && data.ltp !== null) {
          setSelectedLtpDetails({
            ltp: data.ltp,
            high: data.high || 0,
            low: data.low || 0,
            close: data.close || 0
          });
        }
      } catch {
        // Silently retry
      } finally {
        isFetching = false;
      }
    };

    fetchLtp();
    const interval = setInterval(fetchLtp, 250);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selected, selectedSymbol, expiryLabel]);

  const rows = useMemo(() => {
    if (!spot || visibleStrikes.length === 0) return [];
    
    return visibleStrikes.map((strike, idx) => {
      const q = liveQuotes[strike] || { CE: null, PE: null };
      
      const ceLTP = q.CE !== null ? q.CE : calcPremium(spot, strike, dte, true, config.iv);
      const peLTP = q.PE !== null ? q.PE : calcPremium(spot, strike, dte, false, config.iv);
      
      const isATM = strike === atm;
      
      const ceChgPct = ((spot - strike) / spot) * 100 - (dte * 0.5);
      const peChgPct = ((strike - spot) / spot) * 100 - (dte * 0.5);

      const baseOI = Math.max(12000, 250000 - Math.abs(idx - 10) * 15000);
      return {
        strike,
        ceLTP,
        peLTP,
        isATM,
        ceChg: ceChgPct,
        peChg: peChgPct,
        ceOI: baseOI + Math.round(Math.random() * 5000),
        peOI: baseOI + Math.round(Math.random() * 5000),
        ceITM: spot > strike,
        peITM: spot < strike
      };
    });
  }, [spot, atm, dte, visibleStrikes, liveQuotes, config.iv]);

  const showToast = (msg: string) => { 
    setToast(msg); 
    setTimeout(() => setToast(null), 3000); 
  };

  const handleSelect = (strike: number, type: "CE" | "PE", premium: number) => {
    setSelectedLtpDetails(null);
    setSelected({ strike, type, premium });
    setLots(1);
    setOrderType("market");
    setLimitPrice(premium.toString());
    setTimeout(() => orderRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
  };

  const currentPremium = selectedLtpDetails?.ltp ?? (selected 
    ? (liveQuotes[selected.strike]?.[selected.type] ?? selected.premium)
    : 0);

  const executeTrade = async (tradeType: "buy" | "sell") => {
    if (!selected || !token || loading || submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    const symbol = `${selectedSymbol} ${expiryLabel} ${selected.strike} ${selected.type}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
       if (orderType === "limit") {
        const parsedLimit = parseFloat(limitPrice);
        if (isNaN(parsedLimit) || parsedLimit <= 0) {
          throw new Error("Please enter a valid limit price.");
        }
        const res = await fetch(`https://securetrade-n3qh.onrender.com/api/limit-order`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            symbol,
            quantity: lots * config.lotSize,
            price: parsedLimit,
            action: tradeType
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        showToast(`🎯 LIMIT ${tradeType.toUpperCase()} PLACED: ${symbol} @ ₹${parsedLimit}`);
        setSelected(null);
      } else {
        const res = await fetch(`https://securetrade-n3qh.onrender.com/api/${tradeType}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            symbol,
            quantity: lots * config.lotSize,
            price: currentPremium
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        triggerTransactionLock();
        updateBalance(data.newBalance);
        showToast(`✅ ${tradeType.toUpperCase()}: ${symbol} @ ₹${currentPremium}`);
        setSelected(null);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        showToast("❌ Request timed out! Press Enter/Escape in the backend terminal if it is frozen.");
      } else {
        showToast(`❌ ${err.message}`);
      }
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div id="options-chain-panel" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-16 right-4 z-50 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-2xl animate-bounce">
          {toast}
        </div>
      )}

      {/* Index and Expiry selectors */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50">
        
        {/* Search & Index Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 w-64 focus-within:border-blue-500 transition-all">
            <Search className="w-4.5 h-4.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search (e.g. SENSEX 81200)..." 
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              className="text-sm text-slate-700 font-medium focus:outline-none w-full bg-transparent"
            />
            {searchQuery && (
              <button 
                onClick={() => handleSearchChange("")}
                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-black transition-all shrink-0"
              >
                CLEAR
              </button>
            )}
          </div>
          
          <div className="flex gap-1.5">
            {SYMBOLS.map(sym => (
              <button 
                key={sym} 
                onClick={() => { setSelectedSymbol(sym); setSelected(null); setSearchQuery(""); }}
                className={`px-4 py-2 rounded-xl text-sm font-extrabold transition-all border ${
                  selectedSymbol === sym 
                    ? "bg-blue-600 border-blue-600 text-white shadow-sm" 
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {sym.replace("NIFTY50", "NIFTY")}
              </button>
            ))}
          </div>
        </div>

        {/* Live details and Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-3 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-5 text-sm">
            <div>
              <span className="text-slate-400 font-bold block text-[10px] uppercase">Spot Price</span>
              <p className="text-slate-800 font-black text-base font-mono">₹{spot.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="w-px h-7 bg-slate-200" />
            <div>
              <span className="text-slate-400 font-bold block text-[10px] uppercase">ATM Strike</span>
              <p className="text-blue-650 font-black text-base font-mono">{atm.toLocaleString("en-IN")}</p>
            </div>
            <div className="w-px h-7 bg-slate-200" />
            <div>
              <span className="text-slate-400 font-bold block text-[10px] uppercase">Lot Size</span>
              <p className="text-slate-800 font-black text-base">{config.lotSize}</p>
            </div>
          </div>

          {/* Subtabs like LTP / OI */}
          <div className="flex bg-slate-200/60 p-0.5 rounded-lg">
            <button 
              onClick={() => setActiveSubTab("LTP")}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeSubTab === "LTP" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              LTP
            </button>
            <button 
              onClick={() => setActiveSubTab("OI")}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeSubTab === "OI" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              OI
            </button>
          </div>
        </div>
      </div>

      {/* Expiry scrolling selector */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 bg-white border-b border-slate-100 overflow-x-auto whitespace-nowrap scrollbar-none">
        <span className="text-[11px] text-slate-400 font-bold uppercase shrink-0 mr-1.5">Expiry:</span>
        {expiryDates.map((exp, idx) => (
          <button
            key={exp.label}
            onClick={() => { setSelectedExpiryIdx(idx); setSelected(null); }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 border transition-all shrink-0 ${
              selectedExpiryIdx === idx
                ? "bg-slate-100 border-slate-350 text-slate-850 font-extrabold"
                : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            {exp.label}
            <span className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
              exp.type === "M" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
            }`}>
              {exp.type}
            </span>
          </button>
        ))}
      </div>

      {/* Table headers */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-slate-655">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 font-bold text-sm">
              <th colSpan={2} className="py-2.5 text-center text-green-700 border-r border-slate-100 bg-green-50/30">
                CALL (CE)
              </th>
              <th className="py-2.5 text-center text-slate-800 font-extrabold border-r border-slate-100 bg-slate-100/50 w-28">
                STRIKE
              </th>
              <th colSpan={2} className="py-2.5 text-center text-red-700 bg-red-50/30">
                PUT (PE)
              </th>
            </tr>
            <tr className="border-b border-slate-150 text-[11px] text-slate-400 font-bold">
              <th className="py-2 px-3 text-right bg-green-50/10 w-24">OI (K)</th>
              <th className="py-2 px-4 text-right border-r border-slate-100 bg-green-50/15 text-green-600">LTP</th>
              <th className="py-2 px-2 text-center border-r border-slate-100 bg-slate-100/30"></th>
              <th className="py-2 px-4 text-left border-r border-slate-100 bg-red-50/15 text-red-600">LTP</th>
              <th className="py-2 px-3 text-left bg-red-50/10 w-24">OI (K)</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400 font-bold">
                  No matching strike price found for "{searchQuery}"
                </td>
              </tr>
            ) : rows.map((row) => {
              const selCE = selected?.strike === row.strike && selected?.type === "CE";
              const selPE = selected?.strike === row.strike && selected?.type === "PE";
              
              const ceBg = row.ceITM ? "bg-[#fffaf0]" : "bg-white";
              const peBg = row.peITM ? "bg-[#fffaf0]" : "bg-white";

              return (
                <tr 
                  key={row.strike}
                  className={`border-b border-slate-100 hover:bg-slate-50 transition-all ${
                    row.isATM ? "border-y-2 border-blue-200" : ""
                  }`}
                >
                  {/* CE OI */}
                  <td className={`py-2 px-3 text-right font-mono text-slate-450 text-xs ${ceBg}`}>
                    {(row.ceOI / 1000).toFixed(0)}
                  </td>
                  
                  {/* CE LTP */}
                  <td className={`py-2 px-4 text-right border-r border-slate-100 ${ceBg}`}>
                    <button 
                      onClick={() => handleSelect(row.strike, "CE", row.ceLTP)}
                      className={`py-1.5 px-3 rounded-lg font-black font-mono text-sm w-full text-right transition-all flex flex-col items-end ${
                        selCE 
                          ? "bg-green-600 text-white shadow-md scale-105" 
                          : "text-green-600 hover:bg-green-50"
                      }`}
                    >
                      <span className="text-sm font-extrabold">{row.ceLTP.toFixed(2)}</span>
                      <span className={`text-[9px] font-bold leading-none ${selCE ? "text-green-100" : "text-green-500"}`}>
                        {row.ceChg >= 0 ? "+" : ""}{row.ceChg.toFixed(1)}%
                      </span>
                    </button>
                  </td>

                  {/* STRIKE */}
                  <td className={`py-2 px-2 text-center font-black border-r border-slate-100 bg-slate-50/50 w-28 text-slate-800 text-sm ${
                    row.isATM ? "text-blue-650 bg-blue-50/40 font-extrabold" : ""
                  }`}>
                    {row.isATM && <div className="text-[8px] text-blue-600 font-extrabold -mt-1 tracking-wider leading-none">ATM</div>}
                    {row.strike.toLocaleString("en-IN")}
                  </td>

                  {/* PE LTP */}
                  <td className={`py-2 px-4 text-left border-r border-slate-100 ${peBg}`}>
                    <button 
                      onClick={() => handleSelect(row.strike, "PE", row.peLTP)}
                      className={`py-1.5 px-3 rounded-lg font-black font-mono text-sm w-full text-left transition-all flex flex-col items-start ${
                        selPE 
                          ? "bg-red-600 text-white shadow-md scale-105" 
                          : "text-red-600 hover:bg-red-50"
                      }`}
                    >
                      <span className="text-sm font-extrabold">{row.peLTP.toFixed(2)}</span>
                      <span className={`text-[9px] font-bold leading-none ${selPE ? "text-red-100" : "text-red-500"}`}>
                        {row.peChg >= 0 ? "+" : ""}{row.peChg.toFixed(1)}%
                      </span>
                    </button>
                  </td>

                  {/* PE OI */}
                  <td className={`py-2 px-3 text-left font-mono text-slate-450 text-xs ${peBg}`}>
                    {(row.peOI / 1000).toFixed(0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── SECURETRADE BOTTOM ORDER DRAWER / PANEL ── */}
      {selected && (
        <>
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-slate-900/35 backdrop-blur-xs z-45"
            onClick={() => setSelected(null)}
          />
          
          <div 
            ref={orderRef}
            className="fixed bottom-0 left-0 right-0 lg:bottom-4 lg:right-4 lg:left-auto lg:w-96 bg-white border-t lg:border border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.12)] rounded-t-3xl lg:rounded-2xl p-5 z-50 transform translate-y-0 transition-all duration-300 animate-slide-up"
          >
            {/* Drawer handle */}
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-4 lg:hidden" />

            {/* Header info */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    selected.type === "CE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {selected.type === "CE" ? "CALL CE" : "PUT PE"}
                  </span>
                  <span className="text-[10px] text-slate-455 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                    {expiryLabel}
                  </span>
                  <span className="text-[10px] text-slate-455 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                    Lot: {config.lotSize}
                  </span>
                </div>
                <h3 className="text-slate-800 font-black text-lg">
                  {selectedSymbol.replace("NIFTY50","NIFTY")} {selected.strike} {selected.type}
                </h3>
              </div>
              
              {/* Option Chart Button */}
              <div className="flex items-center gap-1.5">
                {onShowChart && (
                  <button 
                    onClick={() => onShowChart(`${selectedSymbol} ${expiryLabel} ${selected.strike} ${selected.type}`)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-black border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 transition-all shrink-0"
                  >
                    📈 Chart
                  </button>
                )}
                <button 
                  onClick={() => setSelected(null)} 
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 bg-slate-100 rounded-full w-7 h-7 flex items-center justify-center transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Price display and balance */}
            <div className="flex items-baseline justify-between mb-4 bg-slate-50 p-3.5 rounded-xl border border-slate-150">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase leading-none mb-1.5">Premium Price</span>
                <span className={`text-3xl font-black font-mono leading-none ${
                  selected.type === "CE" ? "text-green-600" : "text-red-600"
                }`}>
                  ₹{currentPremium.toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold block uppercase leading-none mb-1.5">Available Funds</span>
                <span className="text-slate-700 font-black text-base font-mono leading-none">
                  ₹{balance.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* High / Low / Prev Close Details */}
            <div className="grid grid-cols-3 gap-2 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-150 text-center text-xs">
              <div>
                <span className="text-slate-400 font-bold block text-[9px] uppercase mb-0.5">High</span>
                <span className="text-green-600 font-black font-mono">
                  ₹{selectedLtpDetails?.high ? selectedLtpDetails.high.toFixed(2) : "—"}
                </span>
              </div>
              <div className="border-x border-slate-200">
                <span className="text-slate-400 font-bold block text-[9px] uppercase mb-0.5">Low</span>
                <span className="text-red-600 font-black font-mono">
                  ₹{selectedLtpDetails?.low ? selectedLtpDetails.low.toFixed(2) : "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[9px] uppercase mb-0.5">Prev Close</span>
                <span className="text-slate-655 font-black font-mono">
                  ₹{selectedLtpDetails?.close ? selectedLtpDetails.close.toFixed(2) : "—"}
                </span>
              </div>
            </div>

            {/* Order Type Toggle */}
            <div className="mb-4">
              <label className="block text-slate-500 font-bold mb-1.5 text-xs">Order Type</label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setOrderType("market")}
                  className={`py-2 text-center rounded-lg font-black transition-all cursor-pointer ${
                    orderType === "market"
                      ? "bg-white text-blue-600 shadow-xs"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Market
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType("limit")}
                  className={`py-2 text-center rounded-lg font-black transition-all cursor-pointer ${
                    orderType === "limit"
                      ? "bg-white text-blue-600 shadow-xs"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Limit (Pending)
                </button>
              </div>
            </div>

            {/* Limit Price Input */}
            {orderType === "limit" && (
              <div className="mb-4">
                <label className="block text-slate-500 font-bold mb-1.5 text-xs">Limit Price (₹)</label>
                <input
                  type="number"
                  step="0.05"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 font-mono font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            )}

            {/* Lot size editor */}
            <div className="flex items-center gap-4 mb-5">
              <div className="flex-1">
                <span className="text-xs text-slate-500 font-bold block mb-1.5">Quantity (Lots)</span>
                <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  <button 
                    onClick={() => setLots(l => Math.max(1, l - 1))}
                    className="px-4 py-2.5 text-slate-600 font-black text-xl hover:bg-slate-200 transition-all"
                  >
                    −
                  </button>
                  <input 
                    type="number" 
                    min={1} 
                    value={lots}
                    onChange={e => setLots(Math.max(1, Number(e.target.value)))}
                    className="flex-1 bg-transparent text-slate-800 font-black text-center focus:outline-none py-2 text-base font-mono"
                  />
                  <button 
                    onClick={() => setLots(l => l + 1)}
                    className="px-4 py-2.5 text-slate-600 font-black text-xl hover:bg-slate-200 transition-all"
                  >
                    +
                  </button>
                </div>
              </div>
              
              <div className="text-right shrink-0">
                <span className="text-xs text-slate-450 font-bold block mb-1">Total Shares</span>
                <span className="text-slate-800 font-black text-base font-mono block">
                  {lots * config.lotSize} shares
                </span>
                <span className="text-xs text-slate-400 font-bold">
                  (Lot size: {config.lotSize})
                </span>
              </div>
            </div>

            {/* Total required cost display */}
            <div className="flex justify-between items-center py-3 px-3 border-y border-slate-150 mb-5 text-sm">
              <span className="text-slate-500 font-bold">Estimated Cost:</span>
              <span className="text-slate-800 font-black text-lg font-mono">
                ₹{(currentPremium * config.lotSize * lots).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Buy / Sell buttons */}
            <div className="grid grid-cols-2 gap-3.5">
              <button 
                onClick={() => executeTrade("buy")} 
                disabled={loading}
                className="py-4 bg-green-600 hover:bg-green-500 active:scale-97 text-white font-extrabold text-sm rounded-xl transition-all shadow-md shadow-green-100 disabled:opacity-50 tracking-wider uppercase"
              >
                {loading ? "⏳" : "BUY"}
              </button>
              <button 
                onClick={() => executeTrade("sell")} 
                disabled={loading}
                className="py-4 bg-red-655 hover:bg-red-555 active:scale-97 text-white font-extrabold text-sm rounded-xl transition-all shadow-md shadow-red-100 disabled:opacity-50 tracking-wider uppercase"
              >
                {loading ? "⏳" : "SELL"}
              </button>
            </div>
            
          </div>
        </>
      )}

    </div>
  );
});