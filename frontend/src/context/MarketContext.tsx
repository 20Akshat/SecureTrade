"use client";
import { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { useAuth } from "./AuthContext";

interface MarketData {
  price: number;
  close?: number; // Previous close price of index
  rsi: number;
  signal: string;
  ema9?: number;
  ema21?: number;
  prevEma9?: number;
  prevEma21?: number;
  signal5ema?: string;
  targetPct5ema?: number;
  slPct5ema?: number;
  atr?: number;
  signalGainz?: string;
  targetMultiplier?: number;
  slMultiplier?: number;
}

export interface BotNotification {
  id: string; symbol: string; type: "CE" | "PE";
  strike: number; premium: number; reason: string; timestamp: Date;
  action?: "BUY" | "BUY_MORE" | "SQUARE_OFF";
  lots?: number;
  targetPct?: number;
  slPct?: number;
  isZeroHero?: boolean;
}

export interface ActiveTrade {
  symbol: string;
  entryPrice: number;
  targetPrice: number;
  stopLossPrice: number;
  entryTime: number;
  targetPct?: number;
  slPct?: number;
}

interface MarketContextType {
  marketData: Record<string, MarketData>;
  isAutoTradeActive: boolean;
  toggleAutoTrade: () => void;
  isZeroHeroActive: boolean;
  toggleZeroHero: () => void;
  selectedSymbol: string;
  setSelectedSymbol: (sym: string) => void;
  botStatus: string;
  botNotification: BotNotification | null;
  clearNotification: (confirmed: boolean, extraLots?: number, actualPrice?: number) => void;
  botMaxLots: number;
  setBotMaxLots: (n: number) => void;
  botMaxPremium: number;
  setBotMaxPremium: (n: number) => void;
  isMarketOpen: boolean;
  activeBotTrade: ActiveTrade | null;
  syncPositionWithDb: (positions: any[]) => void;
  strategyMode: "crossover" | "5ema" | "gainz" | "auto";
  setStrategyMode: (mode: "crossover" | "5ema" | "gainz" | "auto") => void;
  targetMode: "probability" | "money";
  setTargetMode: (mode: "probability" | "money") => void;
  requestNotificationPermission: () => Promise<boolean>;
  triggerTestNotification: () => void;
  enabledSymbols: string[];
  setEnabledSymbols: (symbols: string[]) => void;
  triggerTransactionLock: () => void;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

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

function parseDteFromSymbol(symbol: string): number {
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

function getExpiryDate(symbol: string): Date {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const today = new Date(utc + (3600000 * 5.5));
  
  if (symbol.includes("BANKNIFTY")) {
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    let lastTuesday = getLastTuesdayOfMonth(currentYear, currentMonth);
    const isToday = today.getDate() === lastTuesday.getDate() && today.getMonth() === lastTuesday.getMonth();
    const isPastCutoff = isToday && (today.getHours() * 100 + today.getMinutes() > 1530);
    
    if (today.getTime() > lastTuesday.getTime() || isPastCutoff) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      lastTuesday = getLastTuesdayOfMonth(nextYear, nextMonth);
    }
    return lastTuesday;
  }
  
  const targetDay = symbol.includes("SENSEX") ? 4 : 2; // SENSEX=Thursday, NIFTY50=Tuesday
  const diff = targetDay - today.getDay();
  let daysTo = diff < 0 ? diff + 7 : diff;
  if (diff === 0) {
    if (today.getHours() * 100 + today.getMinutes() > 1530) {
      daysTo = 7;
    }
  }
  const expiryDate = new Date(today);
  expiryDate.setDate(today.getDate() + daysTo);
  expiryDate.setHours(15, 30, 0, 0);
  return expiryDate;
}

function getDte(symbol: string): number {
  if (symbol.includes(" ") && (symbol.includes("CE") || symbol.includes("PE"))) {
    return parseDteFromSymbol(symbol);
  }
  const today = new Date();
  const expiry = getExpiryDate(symbol);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

function calcPremium(spot: number, strike: number, dte: number, isCall: boolean, iv: number): number {
  const T = Math.max(dte, 0.5) / 365;
  const sigma = iv;
  const r = 0.07; // 7% risk-free interest rate in India
  
  // Standard Normal Cumulative Distribution Function approximation
  const stdNormalCDF = (x: number): number => {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    if (x > 0) return 1 - prob;
    return prob;
  };
  
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

function getSmartChartTargetAndSL(
  symToScan: string,
  isCall: boolean,
  spot: number,
  rsi: number,
  premium: number,
  activeAtr: number,
  targetMult: number,
  slMult: number
) {
  const isNifty = symToScan === "NIFTY50";
  const isSensex = symToScan === "SENSEX";
  
  // Pivot support/resistance relative to spot
  const rOffset = isNifty ? 70 : (isSensex ? 220 : 220);
  const supportVal = spot - rOffset;
  const resistanceVal = spot + rOffset;
  
  // Swing size based on ATR
  const swingSize = activeAtr || (isNifty ? 15 : (isSensex ? 50 : 45));
  
  let targetIndexPoints = swingSize * 2.0 * targetMult;
  let slIndexPoints = swingSize * 1.2 * slMult;
  
  let suretyScore = 50; // base probability
  
  if (isCall) {
    // Bullish Bounce Setup
    const distToSupport = spot - supportVal;
    if (distToSupport < swingSize * 1.5 && rsi < 42) {
      // Near Support + Low RSI = High probability bounce!
      suretyScore = 78 + (50 - rsi) * 0.5;
      // Target is the resistance level
      targetIndexPoints = Math.max(swingSize * 2.5, resistanceVal - spot);
      slIndexPoints = Math.max(swingSize * 0.8, spot - supportVal + (isNifty ? 5 : 15));
    } else if (rsi > 65) {
      // Overbought CE = Low probability, tight target
      suretyScore = 35;
      targetIndexPoints = swingSize * 1.2;
    }
  } else {
    // Bearish Rejection Setup
    const distToResistance = resistanceVal - spot;
    if (distToResistance < swingSize * 1.5 && rsi > 58) {
      // Near Resistance + High RSI = High probability rejection!
      suretyScore = 78 + (rsi - 50) * 0.5;
      // Target is the support level
      targetIndexPoints = Math.max(swingSize * 2.5, spot - supportVal);
      slIndexPoints = Math.max(swingSize * 0.8, resistanceVal - spot + (isNifty ? 5 : 15));
    } else if (rsi < 35) {
      // Oversold PE = Low probability
      suretyScore = 35;
      targetIndexPoints = swingSize * 1.2;
    }
  }
  
  // Cap surety score
  suretyScore = Math.max(15, Math.min(92, Math.round(suretyScore)));
  
  // Convert index points to option premium percentages (assuming 0.55 delta for ATM options)
  const delta = 0.55;
  const optionTargetPoints = targetIndexPoints * delta;
  const optionSlPoints = slIndexPoints * delta;
  
  // Truly analysis-based targets and stop losses without arbitrary minimum percentage floors!
  // This ensures target points represent the actual expected move of the underlying index.
  let targetPct = (optionTargetPoints / premium) * 100;
  let slPct = (optionSlPoints / premium) * 100;
  
  // Apply reasonable safety limits (at least 6% target/SL to avoid tiny triggers, and max 70% to avoid extreme levels)
  targetPct = Math.max(6, Math.min(70, targetPct));
  slPct = Math.max(5, Math.min(30, slPct));
  
  return { targetPct, slPct, probability: suretyScore };
}

export function MarketProvider({ children }: { children: ReactNode }) {
  const { token, updateBalance, balance } = useAuth();
  const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
  const [selectedSymbol, setSelectedSymbol] = useState("NIFTY50");
  const [isAutoTradeActive, setIsAutoTradeActive] = useState(false);
  const [botStatus, setBotStatus] = useState("⭕ Bot is OFF");
  const [botNotification, setBotNotification] = useState<BotNotification | null>(null);
  const [botMaxLots, setBotMaxLots] = useState(1);
  const [botMaxPremium, setBotMaxPremium] = useState(250); // Default to ₹250
  const [isMarketOpen, setIsMarketOpen] = useState(true);
  const [activeBotTrade, setActiveBotTrade] = useState<ActiveTrade | null>(null);
  const [isZeroHeroActive, setIsZeroHeroActive] = useState(false);
  const [strategyMode, setStrategyMode] = useState<"crossover" | "5ema" | "gainz" | "auto">("auto");
  const [targetMode, setTargetMode] = useState<"probability" | "money">("probability");
  const [enabledSymbols, setEnabledSymbols] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("st_enabled_symbols_v2");
      return saved ? JSON.parse(saved) : ["NIFTY50", "SENSEX"];
    }
    return ["NIFTY50", "SENSEX"];
  });

  useEffect(() => {
    localStorage.setItem("st_enabled_symbols_v2", JSON.stringify(enabledSymbols));
  }, [enabledSymbols]);


  const toggleZeroHero = () => {
    setIsZeroHeroActive(prev => {
      const next = !prev;
      if (next) {
        setBotStatus("⚡ Zero-Hero Mode Active (Only Zero-Hero trades will be taken)");
      } else {
        setBotStatus(isAutoTradeActive ? "🟢 Bot Active - Scanning market..." : "⭕ Bot is OFF");
      }
      return next;
    });
  };

  // Cache refs for option pricing and callback ref for auth balance updates
  const lastOptionFetchTime = useRef<number>(0);
  const lastOptionPremium = useRef<number>(0);
  const fetchingOptionRef = useRef<boolean>(false);
  const lastZhOptionFetchTime = useRef<number>(0);
  const lastZhOptionPremium = useRef<number>(0);
  const fetchingZhOptionRef = useRef<boolean>(false);
  const updateBalanceRef = useRef(updateBalance);
  const balanceRef = useRef(balance);
  const lastMarketDataRef = useRef<Record<string, MarketData>>({});
  const lastResolvedEntryTime = useRef<number>(0);
  
  const lastActionTime = useRef<number>(0);
  const triggerTransactionLock = () => {
    console.log("🔒 [Transaction Lock] Activating 6-second DB sync lock.");
    lastActionTime.current = Date.now();
  };

  const getIndexAndDirection = (symbol: string): string => {
    if (!symbol) return "";
    const parts = symbol.trim().split(/\s+/);
    if (parts.length < 2) return symbol;
    const index = parts[0]; // e.g. "NIFTY50" or "SENSEX"
    const direction = parts[parts.length - 1]; // e.g. "CE" or "PE"
    return `${index}-${direction}`;
  };

  useEffect(() => {
    updateBalanceRef.current = updateBalance;
  }, [updateBalance]);

  useEffect(() => {
    balanceRef.current = balance;
  }, [balance]);

  // Browser notification permission request on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  const showBrowserNotification = (title: string, body: string) => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        try {
          new Notification(title, {
            body,
            icon: "/logo.png"
          });
        } catch (e) {
          console.error("Failed to trigger browser notification", e);
        }
      }
    }
  };

  const playVoiceAlert = (text: string) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("Speech synthesis failed", err);
      }
    }
  };

  const requestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        showBrowserNotification("SecureTrade: Alerts Enabled! 🔔", "You will now receive desktop notifications for all trading signals.");
        return true;
      }
    }
    return false;
  };

  const triggerTestNotification = () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        showBrowserNotification("SecureTrade: Test Notification! 🚀", "Congratulations! Browser push alerts are working perfectly.");
        alert("Test notification sent! If you do not see a banner in the corner of your screen, please check if Windows 'Do Not Disturb' / 'Focus Assist' is ON, or if Chrome/Brave notifications are blocked in Windows System Notification Settings.");
      } else {
        alert("Notification permission is not granted. Please enable it in browser settings (click the lock icon in URL bar).");
      }
    } else {
      alert("Browser notifications are not supported on this device.");
    }
  };

  // Bot ki memory - yahi sab track karta hai
  const bot = useRef({
    active: false,
    token: "",
    symbol: "NIFTY50",
    maxLots: 1,
    lastTradeWasLoss: false,
    // Position tracking
    waitingForUser: false,  // Notification show ho rahi hai, user ka wait
    hasPosition: false,     // Trade execute ho gayi
    entryPrice: 0,
    entrySymbol: "",
    entryTime: 0,           // Timestamp of trade entry to monitor time decay
    cooldown: false,        // Signal ke baad 30 sec wait
    hasRecommendedSquareOff: false,
    hasRecommendedAveraging: false,
    hasNotified15MinAction: false,  // Track if 15-minute trend confirm was sent
    
    // Second Position tracking
    hasSecondPosition: false,
    entryPrice2: 0,
    entrySymbol2: "",
    entryTime2: 0,
    maxLots2: 1,
    isShort2: false,
    targetPct2: 20,
    slPct2: 15,
    hasNotified15MinAction2: false,
    hasRecommendedSquareOff2: false,
    hasRecommendedAveraging2: false,
    maxPremium1: 0,
    maxPremium2: 0,

    lastTradedSymbol: "",
    lastExitTime: 0,
    isShort: false,
    isZeroHeroActive: false,
    targetPct: 20,          // Target % of active trade
    slPct: 15,              // Stop Loss % of active trade
    strategyMode: "auto" as "crossover" | "5ema" | "gainz" | "auto",
    targetMode: "probability" as "probability" | "money",
    enabledSymbols: ["NIFTY50", "SENSEX"] as string[],
    // Zero-Hero specific position tracking
    hasZeroHeroPosition: false,
    zhEntryPrice: 0,
    zhEntrySymbol: "",
    zhEntryTime: 0,
    zhMaxLots: 1,
    zhIsShort: false,
    zhTargetPct: 150,
    zhSlPct: 80,
    zhHasRecommendedAveraging: false,
  });

  useEffect(() => {
    bot.current.active = isAutoTradeActive;
    bot.current.token = token || "";
    bot.current.symbol = selectedSymbol;
    bot.current.maxLots = botMaxLots;
    bot.current.isZeroHeroActive = isZeroHeroActive;
    bot.current.strategyMode = strategyMode;
    bot.current.targetMode = targetMode;
    bot.current.enabledSymbols = enabledSymbols;
  }, [isAutoTradeActive, token, selectedSymbol, botMaxLots, isZeroHeroActive, strategyMode, targetMode, enabledSymbols]);

  const toggleAutoTrade = () => {
    setIsAutoTradeActive(prev => {
      const next = !prev;
      if (next) {
        setBotStatus("🟢 Bot Active - Scanning market...");
      } else {
        setBotStatus("⭕ Bot is OFF");
        // Put the active notification symbol on cooldown if turning OFF to prevent immediate re-popup on toggle ON
        if (botNotification && (botNotification.action === "BUY" || !botNotification.action)) {
          bot.current.lastTradedSymbol = getIndexAndDirection(botNotification.symbol);
          bot.current.lastExitTime = Date.now();
          lastResolvedEntryTime.current = Date.now();
        }
        // Sab reset karo
        bot.current.waitingForUser = false;
        bot.current.hasPosition = false;
        bot.current.entryPrice = 0;
        bot.current.hasZeroHeroPosition = false;
        bot.current.zhEntryPrice = 0;
        bot.current.cooldown = false;
        bot.current.hasRecommendedSquareOff = false;
        bot.current.hasRecommendedAveraging = false;
        bot.current.zhHasRecommendedAveraging = false;
        setBotNotification(null);
        setActiveBotTrade(null);
      }
      return next;
    });
  };

  // confirmed=true → user ne confirm kiya, confirmed=false → user ne ignore/cancel kiya
  const clearNotification = (confirmed: boolean, extraLots?: number, actualPrice?: number) => {
    if (!botNotification) return;
    const action = botNotification.action || "BUY";
    const isZH = botNotification.isZeroHero;
    setBotNotification(null);
    bot.current.waitingForUser = false;
    
    if (action === "BUY") {
      lastResolvedEntryTime.current = Date.now();
    }
    
    const b = bot.current;

    if (confirmed) {
      lastActionTime.current = Date.now();
      const finalPrice = actualPrice || botNotification.premium;
      if (action === "BUY") {
        const config = SYMBOL_CONFIG[botNotification.symbol.split(" ")[0]] || SYMBOL_CONFIG.NIFTY50;
        const targetPct = botNotification.targetPct || 150;
        const slPct = botNotification.slPct || 80;
        const targetPrice = finalPrice * (1 + targetPct / 100);
        const stopLossPrice = finalPrice * (1 - slPct / 100);

        if (isZH) {
          b.hasZeroHeroPosition = true;
          b.zhEntryTime = Date.now();
          b.zhEntrySymbol = botNotification.symbol;
          b.zhEntryPrice = finalPrice;
          b.zhMaxLots = extraLots || botMaxLots;
          lastZhOptionPremium.current = finalPrice;
          lastZhOptionFetchTime.current = 0;
          b.zhIsShort = false;
          b.zhTargetPct = targetPct;
          b.zhSlPct = slPct;
          b.zhHasRecommendedAveraging = false;

          try {
            const storedLimits = localStorage.getItem("st_active_limits");
            const limits = storedLimits ? JSON.parse(storedLimits) : {};
            limits[b.zhEntrySymbol] = {
              sl: parseFloat(stopLossPrice.toFixed(2)),
              target: parseFloat(targetPrice.toFixed(2)),
              qty: b.zhMaxLots * config.lotSize,
              isZeroHero: true
            };
            localStorage.setItem("st_active_limits", JSON.stringify(limits));
          } catch {}

          if (selectedSymbol === b.zhEntrySymbol) {
            setActiveBotTrade({
              symbol: b.zhEntrySymbol,
              entryPrice: b.zhEntryPrice,
              targetPrice,
              stopLossPrice,
              entryTime: Date.now()
            });
          }
          
          b.cooldown = false;
          setBotStatus(`⚡ ZH Position Active: ${b.zhEntrySymbol} | Entry: ₹${b.zhEntryPrice.toFixed(2)} | Monitoring Target/SL...`);
        } else {
          if (b.hasPosition) {
            b.hasSecondPosition = true;
            b.entryTime2 = Date.now();
            b.entrySymbol2 = botNotification.symbol;
            b.entryPrice2 = finalPrice;
            b.maxLots2 = extraLots || botMaxLots;
            b.isShort2 = botNotification.type === "PE";
            b.targetPct2 = targetPct;
            b.slPct2 = slPct;
            b.hasNotified15MinAction2 = false;
            b.hasRecommendedSquareOff2 = false;
            b.hasRecommendedAveraging2 = false;

            try {
              const storedLimits = localStorage.getItem("st_active_limits");
              const limits = storedLimits ? JSON.parse(storedLimits) : {};
              limits[b.entrySymbol2] = {
                sl: parseFloat(stopLossPrice.toFixed(2)),
                target: parseFloat(targetPrice.toFixed(2)),
                qty: b.maxLots2 * config.lotSize
              };
              localStorage.setItem("st_active_limits", JSON.stringify(limits));
            } catch {}

            if (selectedSymbol === b.entrySymbol2) {
              setActiveBotTrade({
                symbol: b.entrySymbol2,
                entryPrice: b.entryPrice2,
                targetPrice,
                stopLossPrice,
                entryTime: Date.now()
              });
            }

            b.cooldown = false;
            setBotStatus(`⚡ Position 2 Active: ${b.entrySymbol2} | Entry: ₹${b.entryPrice2.toFixed(2)} | Monitoring Target/SL...`);
          } else {
            b.hasPosition = true;
            b.entryTime = Date.now();
            b.entrySymbol = botNotification.symbol;
            b.entryPrice = finalPrice;
            b.maxLots = extraLots || botMaxLots;
            lastOptionPremium.current = finalPrice;
            lastOptionFetchTime.current = 0;
            b.hasRecommendedSquareOff = false;
            b.hasRecommendedAveraging = false;
            b.isShort = botNotification.type === "PE";
            b.targetPct = targetPct;
            b.slPct = slPct;
            b.hasNotified15MinAction = false;

            try {
              const storedLimits = localStorage.getItem("st_active_limits");
              const limits = storedLimits ? JSON.parse(storedLimits) : {};
              limits[b.entrySymbol] = {
                sl: parseFloat(stopLossPrice.toFixed(2)),
                target: parseFloat(targetPrice.toFixed(2)),
                qty: b.maxLots * config.lotSize
              };
              localStorage.setItem("st_active_limits", JSON.stringify(limits));
            } catch {}

            if (selectedSymbol === b.entrySymbol) {
              setActiveBotTrade({
                symbol: b.entrySymbol,
                entryPrice: b.entryPrice,
                targetPrice,
                stopLossPrice,
                entryTime: Date.now()
              });
            }

            b.cooldown = false;
            setBotStatus(`📊 Position Active: ${b.entrySymbol} | Entry: ₹${b.entryPrice.toFixed(2)} | Monitoring Target/SL...`);
          }
        }
      } else if (action === "BUY_MORE" && extraLots) {
        const isZHAvg = isZH;
        if (isZHAvg) {
          const prevLots = b.zhMaxLots;
          const prevPrice = b.zhEntryPrice;
          const currentPrice = finalPrice;
          const newTotalLots = prevLots + extraLots;
          const newAveragePrice = ((prevPrice * prevLots) + (currentPrice * extraLots)) / newTotalLots;
          
          b.zhEntryPrice = newAveragePrice;
          b.zhMaxLots = newTotalLots;
          b.zhHasRecommendedAveraging = false;
          
          const targetPrice = newAveragePrice * (1 + b.zhTargetPct / 100);
          const stopLossPrice = newAveragePrice * (1 - b.zhSlPct / 100);

          if (selectedSymbol === b.zhEntrySymbol) {
            setActiveBotTrade({
              symbol: b.zhEntrySymbol,
              entryPrice: newAveragePrice,
              targetPrice,
              stopLossPrice,
              entryTime: b.zhEntryTime
            });
          }
          
          b.cooldown = true;
          setTimeout(() => { b.cooldown = false; }, 15000);
          setBotStatus(`⚡ ZH Position Averaged: ${b.zhEntrySymbol} | New Avg: ₹${newAveragePrice.toFixed(2)} | Total Lots: ${newTotalLots}`);
        } else {
          const prevLots = b.maxLots;
          const prevPrice = b.entryPrice;
          const currentPrice = finalPrice;
          const newTotalLots = prevLots + extraLots;
          const newAveragePrice = ((prevPrice * prevLots) + (currentPrice * extraLots)) / newTotalLots;
          
          b.entryPrice = newAveragePrice;
          b.maxLots = newTotalLots;
          b.hasRecommendedAveraging = false;
          
          const targetPrice = newAveragePrice * (1 + (b.targetPct || 20) / 100);
          const stopLossPrice = newAveragePrice * (1 - (b.slPct || 15) / 100);

          if (selectedSymbol === b.entrySymbol) {
            setActiveBotTrade({
              symbol: b.entrySymbol,
              entryPrice: newAveragePrice,
              targetPrice,
              stopLossPrice,
              entryTime: b.entryTime
            });
          }
          
          b.cooldown = true;
          setTimeout(() => { b.cooldown = false; }, 15000);
          setBotStatus(`📊 Position Averaged: ${b.entrySymbol} | New Avg: ₹${newAveragePrice.toFixed(2)} | Total Lots: ${newTotalLots}`);
        }
      } else if (action === "SQUARE_OFF") {
        if (isZH) {
          b.lastTradedSymbol = getIndexAndDirection(b.zhEntrySymbol);
          b.lastExitTime = Date.now();
          b.hasZeroHeroPosition = false;
          b.zhEntryPrice = 0;
          b.zhMaxLots = botMaxLots;
          b.cooldown = true;
          if (selectedSymbol === b.zhEntrySymbol) {
            setActiveBotTrade(null);
          }
          setBotStatus("⏹️ ZH Position squared off by early exit. Waiting 30s...");
          setTimeout(() => {
            b.cooldown = false;
          }, 30000);
        } else {
          b.lastTradedSymbol = getIndexAndDirection(b.entrySymbol);
          b.lastExitTime = Date.now();
          b.hasPosition = false;
          b.entryPrice = 0;
          b.maxLots = botMaxLots;
          b.cooldown = true;
          if (selectedSymbol === b.entrySymbol) {
            setActiveBotTrade(null);
          }
          setBotStatus("⏹️ Position squared off by early exit. Waiting 30s...");
          setTimeout(() => {
            b.cooldown = false;
          }, 30000);
        }
      }
    } else {
      if (action === "BUY") {
        b.lastTradedSymbol = getIndexAndDirection(botNotification.symbol);
        b.lastExitTime = Date.now();
        setBotStatus("⏸️ Signal ignored. Cooldown set for this contract.");
      } else {
        b.cooldown = true;
        setTimeout(() => { b.cooldown = false; }, 30000);
      }
    }
  };

  const syncPositionWithDb = (positions: any[]) => {
    const b = bot.current;
    if (!b.active || b.cooldown) return;

    // Ignore sync for 6 seconds after any buy/sell/average action to let DB catch up
    if (Date.now() - lastActionTime.current < 6000) {
      return;
    }

    // Load limits to check if ZeroHero
    let limits: Record<string, any> = {};
    try {
      const storedLimits = localStorage.getItem("st_active_limits");
      if (storedLimits) limits = JSON.parse(storedLimits);
    } catch {}

    const activeDbPositions = positions.filter(p => Math.abs(p.quantity) > 0);
    const activeZhDbPos = activeDbPositions.find(p => limits[p.symbol]?.isZeroHero);
    const activeNormalDbPos = activeDbPositions.find(p => !limits[p.symbol]?.isZeroHero);

    // 1. Sync Zero-Hero Position
    if (activeZhDbPos) {
      const botSymbol = activeZhDbPos.symbol;
      const config = SYMBOL_CONFIG[botSymbol.split(" ")[0]] || SYMBOL_CONFIG.NIFTY50;
      const actualLots = Math.round(Math.abs(activeZhDbPos.quantity) / config.lotSize);

      if (!b.hasZeroHeroPosition || b.zhEntrySymbol !== botSymbol) {
        console.log(`🤖 [Bot Sync] Syncing active Zero-Hero trade from DB: ${botSymbol}`);
        b.hasZeroHeroPosition = true;
        b.zhEntrySymbol = botSymbol;
        b.zhEntryPrice = activeZhDbPos.averagePrice;
        b.zhEntryTime = Date.now();
        b.zhMaxLots = actualLots;
        lastZhOptionPremium.current = activeZhDbPos.averagePrice;
        lastZhOptionFetchTime.current = 0;
        b.zhIsShort = activeZhDbPos.symbol.endsWith("PE");
        b.zhHasRecommendedAveraging = false;

        b.zhTargetPct = 150;
        b.zhSlPct = 80;

        const targetPrice = activeZhDbPos.take_profit ? Number(activeZhDbPos.take_profit) : (activeZhDbPos.averagePrice * (1 + b.zhTargetPct / 100));
        const stopLossPrice = activeZhDbPos.stop_loss ? Number(activeZhDbPos.stop_loss) : (activeZhDbPos.averagePrice * (1 - b.zhSlPct / 100));

        try {
          limits[botSymbol] = {
            sl: parseFloat(stopLossPrice.toFixed(2)),
            target: parseFloat(targetPrice.toFixed(2)),
            qty: Math.abs(activeZhDbPos.quantity),
            isZeroHero: true
          };
          localStorage.setItem("st_active_limits", JSON.stringify(limits));
        } catch {}
      } else {
        if (b.zhMaxLots !== actualLots) {
          console.log(`🤖 [Bot Sync] Syncing bot Zero-Hero lots to match DB: ${b.zhMaxLots} -> ${actualLots}`);
          b.zhMaxLots = actualLots;
        }
      }
    } else {
      if (b.hasZeroHeroPosition) {
        const botSymbol = b.zhEntrySymbol;
        console.log(`🤖 [Bot Sync] Zero-Hero position for ${botSymbol} was closed. Syncing bot state.`);
        b.lastTradedSymbol = getIndexAndDirection(botSymbol);
        b.lastExitTime = Date.now();
        b.hasZeroHeroPosition = false;
        b.zhEntryPrice = 0;
        b.zhMaxLots = botMaxLots;
      }
    }

    // 2. Sync Normal Positions
    const activeNormalDbPositions = activeDbPositions.filter(p => !limits[p.symbol]?.isZeroHero);

    // Sync Position 1
    if (activeNormalDbPositions.length > 0) {
      const pos1 = activeNormalDbPositions[0];
      const botSymbol = pos1.symbol;
      const config = SYMBOL_CONFIG[botSymbol.split(" ")[0]] || SYMBOL_CONFIG.NIFTY50;
      const actualLots = Math.round(Math.abs(pos1.quantity) / config.lotSize);

      if (!b.hasPosition || b.entrySymbol !== botSymbol) {
        console.log(`🤖 [Bot Sync] Syncing active normal trade 1 from DB: ${botSymbol}`);
        b.hasPosition = true;
        b.entrySymbol = botSymbol;
        b.entryPrice = pos1.averagePrice;
        b.entryTime = Date.now();
        b.maxLots = actualLots;
        lastOptionPremium.current = pos1.averagePrice;
        lastOptionFetchTime.current = 0;
        b.isShort = pos1.symbol.endsWith("PE");
        b.hasRecommendedSquareOff = false;
        b.hasRecommendedAveraging = false;

        const finalTargetPct = botSymbol.includes("BANKNIFTY") ? 25 : 20;
        const finalSlPct = botSymbol.includes("BANKNIFTY") ? 15 : 15;
        b.targetPct = finalTargetPct;
        b.slPct = finalSlPct;

        const targetPrice = pos1.take_profit ? Number(pos1.take_profit) : (pos1.averagePrice * (1 + finalTargetPct / 100));
        const stopLossPrice = pos1.stop_loss ? Number(pos1.stop_loss) : (pos1.averagePrice * (1 - finalSlPct / 100));

        try {
          limits[botSymbol] = {
            sl: parseFloat(stopLossPrice.toFixed(2)),
            target: parseFloat(targetPrice.toFixed(2)),
            qty: Math.abs(pos1.quantity)
          };
          localStorage.setItem("st_active_limits", JSON.stringify(limits));
        } catch {}
      } else {
        if (b.maxLots !== actualLots) {
          console.log(`🤖 [Bot Sync] Syncing bot normal lots to match DB: ${b.maxLots} -> ${actualLots}`);
          b.maxLots = actualLots;
        }
      }
    } else {
      if (b.hasPosition) {
        const botSymbol = b.entrySymbol;
        console.log(`🤖 [Bot Sync] Normal position for ${botSymbol} was closed. Syncing bot state.`);
        
        const fetchLastTradeOutcome = async () => {
          try {
            const res = await fetch("https://securetrade-n3qh.onrender.com/api/trades", {
              headers: { Authorization: `Bearer ${token || b.token}` }
            });
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data) && data.length > 0) {
                const closedTrade = data.find((t: any) => t.symbol === botSymbol && t.status !== 'open');
                if (closedTrade) {
                  b.lastTradeWasLoss = (Number(closedTrade.pnl || 0) < 0);
                  console.log(`🤖 [Bot Sync] Last closed trade ${botSymbol} outcome check: P&L = ${closedTrade.pnl}, lastTradeWasLoss = ${b.lastTradeWasLoss}`);
                }
              }
            }
          } catch (e) {
            console.error("Error fetching last trade outcome:", e);
          }
        };
        fetchLastTradeOutcome();

        b.lastTradedSymbol = getIndexAndDirection(botSymbol);
        b.lastExitTime = Date.now();
        b.hasPosition = false;
        b.entryPrice = 0;
        b.maxLots = botMaxLots;
      }
    }

    // Sync Position 2
    if (activeNormalDbPositions.length > 1) {
      const pos2 = activeNormalDbPositions[1];
      const botSymbol2 = pos2.symbol;
      const config2 = SYMBOL_CONFIG[botSymbol2.split(" ")[0]] || SYMBOL_CONFIG.NIFTY50;
      const actualLots2 = Math.round(Math.abs(pos2.quantity) / config2.lotSize);

      if (!b.hasSecondPosition || b.entrySymbol2 !== botSymbol2) {
        console.log(`🤖 [Bot Sync] Syncing active normal trade 2 from DB: ${botSymbol2}`);
        b.hasSecondPosition = true;
        b.entrySymbol2 = botSymbol2;
        b.entryPrice2 = pos2.averagePrice;
        b.entryTime2 = Date.now();
        b.maxLots2 = actualLots2;
        b.isShort2 = pos2.symbol.endsWith("PE");
        b.hasRecommendedSquareOff2 = false;
        b.hasRecommendedAveraging2 = false;

        const finalTargetPct2 = botSymbol2.includes("BANKNIFTY") ? 25 : 20;
        const finalSlPct2 = botSymbol2.includes("BANKNIFTY") ? 15 : 15;
        b.targetPct2 = finalTargetPct2;
        b.slPct2 = finalSlPct2;

        const targetPrice2 = pos2.take_profit ? Number(pos2.take_profit) : (pos2.averagePrice * (1 + finalTargetPct2 / 100));
        const stopLossPrice2 = pos2.stop_loss ? Number(pos2.stop_loss) : (pos2.averagePrice * (1 - finalSlPct2 / 100));

        try {
          limits[botSymbol2] = {
            sl: parseFloat(stopLossPrice2.toFixed(2)),
            target: parseFloat(targetPrice2.toFixed(2)),
            qty: Math.abs(pos2.quantity)
          };
          localStorage.setItem("st_active_limits", JSON.stringify(limits));
        } catch {}
      } else {
        if (b.maxLots2 !== actualLots2) {
          console.log(`🤖 [Bot Sync] Syncing bot normal 2 lots to match DB: ${b.maxLots2} -> ${actualLots2}`);
          b.maxLots2 = actualLots2;
        }
      }
    } else {
      if (b.hasSecondPosition) {
        const botSymbol2 = b.entrySymbol2;
        console.log(`🤖 [Bot Sync] Normal position 2 for ${botSymbol2} was closed. Syncing bot state.`);
        b.hasSecondPosition = false;
        b.entryPrice2 = 0;
        b.entrySymbol2 = "";
        b.maxLots2 = botMaxLots;
      }
    }
  };

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let active = true;

    const connect = () => {
      if (!active) return;
      console.log("Connecting to WebSocket...");
      ws = new WebSocket("wss://securetrade-n3qh.onrender.com");

      ws.onmessage = async (event) => {
        if (!active) return;
        const raw = JSON.parse(event.data);

        const formatted: Record<string, MarketData> = {};
        let openStatus = true;
        for (const sym in raw) {
          formatted[sym] = {
            price: parseFloat(raw[sym].price),
            close: raw[sym].close ? parseFloat(raw[sym].close) : undefined,
            rsi: parseFloat(raw[sym].rsi),
            signal: raw[sym].signal,
            ema9: raw[sym].ema9 ? parseFloat(raw[sym].ema9) : undefined,
            ema21: raw[sym].ema21 ? parseFloat(raw[sym].ema21) : undefined,
            prevEma9: raw[sym].prevEma9 ? parseFloat(raw[sym].prevEma9) : undefined,
            prevEma21: raw[sym].prevEma21 ? parseFloat(raw[sym].prevEma21) : undefined,
            signal5ema: raw[sym].signal5ema || "WAIT",
            targetPct5ema: raw[sym].targetPct5ema ? parseFloat(raw[sym].targetPct5ema) : undefined,
            slPct5ema: raw[sym].slPct5ema ? parseFloat(raw[sym].slPct5ema) : undefined,
            atr: raw[sym].atr ? parseFloat(raw[sym].atr) : undefined,
            signalGainz: raw[sym].signalGainz || "WAIT",
            targetMultiplier: raw[sym].targetMultiplier ? parseFloat(raw[sym].targetMultiplier) : undefined,
            slMultiplier: raw[sym].slMultiplier ? parseFloat(raw[sym].slMultiplier) : undefined,
          };
          if (raw[sym].isMarketOpen !== undefined) {
            openStatus = raw[sym].isMarketOpen;
          }
        }
        setMarketData(formatted);
        setIsMarketOpen(openStatus);

        // Update refs for transition checks
        const prevMarketData = { ...lastMarketDataRef.current };
        for (const sym in raw) {
          lastMarketDataRef.current[sym] = {
            price: parseFloat(raw[sym].price),
            rsi: parseFloat(raw[sym].rsi),
            signal: raw[sym].signal
          };
        }

        const b = bot.current;

        // Bot off hai, cooldown mein hai, notification show ho rahi hai, ya market closed hai
        if (!b.active || !b.token || !isMarketOpen) return;

        // ============================================
        // CASE 2: Exit check karo first (Independent blocks for parallel trades)
        // ============================================

        // --------------------------------------------
        // Normal Trade Exit Monitor
        // --------------------------------------------
        const normalPositionsToMonitor = [];
        if (b.hasPosition && b.entryPrice > 0) {
          normalPositionsToMonitor.push({
            id: 1,
            symbol: b.entrySymbol,
            entryPrice: b.entryPrice,
            entryTime: b.entryTime,
            targetPct: b.targetPct,
            slPct: b.slPct,
            isShort: b.isShort,
            hasRecommendedSquareOff: b.hasRecommendedSquareOff,
            hasRecommendedAveraging: b.hasRecommendedAveraging,
            hasNotified15MinAction: b.hasNotified15MinAction
          });
        }
        if (b.hasSecondPosition && b.entryPrice2 > 0) {
          normalPositionsToMonitor.push({
            id: 2,
            symbol: b.entrySymbol2,
            entryPrice: b.entryPrice2,
            entryTime: b.entryTime2,
            targetPct: b.targetPct2,
            slPct: b.slPct2,
            isShort: b.isShort2,
            hasRecommendedSquareOff: b.hasRecommendedSquareOff2,
            hasRecommendedAveraging: b.hasRecommendedAveraging2,
            hasNotified15MinAction: b.hasNotified15MinAction2
          });
        }

        for (const t of normalPositionsToMonitor) {
          const posUnderlying = t.symbol.split(/\s+/)[0];
          const posActive = formatted[posUnderlying];

          if (posActive && posActive.price) {
            const posSpot = posActive.price;
            const posRsi = posActive.rsi;
            const posConfig = SYMBOL_CONFIG[posUnderlying] || SYMBOL_CONFIG.NIFTY50;

            const parts = t.symbol.split(/\s+/);
            const typeIdx = parts.findIndex(p => p === "CE" || p === "PE");
            const strike = typeIdx !== -1 ? parseFloat(parts[typeIdx - 1]) : NaN;
            const isCall = typeIdx !== -1 ? parts[typeIdx] === "CE" : false;

            if (!isNaN(strike)) {
              let currentPremium = t.entryPrice;
              let gotRealPrice = false;
              
              if (Date.now() - lastOptionFetchTime.current >= 3000 && !fetchingOptionRef.current) {
                fetchingOptionRef.current = true;
                lastOptionFetchTime.current = Date.now();
                try {
                  const ltpRes = await fetch(`https://securetrade-n3qh.onrender.com/api/option-ltp`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ symbol: t.symbol })
                  });
                  if (ltpRes.ok) {
                    const ltpData = await ltpRes.json();
                    if (ltpData.ltp && ltpData.ltp > 0) {
                      currentPremium = ltpData.ltp;
                      lastOptionPremium.current = ltpData.ltp;
                      gotRealPrice = true;
                    }
                  }
                } catch {} finally {
                  fetchingOptionRef.current = false;
                }
              }

              if (!gotRealPrice) {
                currentPremium = lastOptionPremium.current || t.entryPrice;
              }

              // 🛡️ GLITCH GUARD: 10-second grace period after entry
              const msSinceEntry = Date.now() - t.entryTime;
              if (msSinceEntry < 10000) {
                continue; // Don't check target/SL in the first 10 seconds after entry
              }

              // 🛡️ GLITCH GUARD: Sanity check - reject impossible price spikes
              if (currentPremium > t.entryPrice * 2.5 || currentPremium < t.entryPrice * 0.25) {
                console.warn(`🚨 [Glitch Guard] Suspicious price ₹${currentPremium.toFixed(2)} rejected for ${t.symbol} (entry ₹${t.entryPrice.toFixed(2)}). Skipping target/SL check.`);
                continue;
              }

              if (currentPremium) {
                // Update peak premium and PnL for Trailing Stop Loss
                if (t.id === 1) {
                  if (!b.maxPremium1 || currentPremium > b.maxPremium1) {
                    b.maxPremium1 = currentPremium;
                  }
                } else {
                  if (!b.maxPremium2 || currentPremium > b.maxPremium2) {
                    b.maxPremium2 = currentPremium;
                  }
                }

                const peakPremium = t.id === 1 ? (b.maxPremium1 || currentPremium) : (b.maxPremium2 || currentPremium);
                const pnlPercent = ((currentPremium - t.entryPrice) / t.entryPrice) * 100;
                const peakPnlPercent = ((peakPremium - t.entryPrice) / t.entryPrice) * 100;

                const elapsedSeconds = Math.floor((Date.now() - t.entryTime) / 1000);
                const elapsedMinutes = elapsedSeconds / 60;

                // 15-Minute Trend Advisor Alerts (Hold/Warning)
                if (elapsedMinutes >= 15 && !t.hasNotified15MinAction) {
                  if (t.id === 1) b.hasNotified15MinAction = true;
                  else b.hasNotified15MinAction2 = true;

                  const isCallTrendHold = isCall ? (posActive.price > (posActive.ema9 || 0) && posRsi > 50) : (posActive.price < (posActive.ema9 || 0) && posRsi < 50);
                  if (isCallTrendHold) {
                    setBotStatus(`🔔 15-Min Advisor: Hold! Trend on ${t.symbol} is still strong, premium expected to rise.`);
                    showBrowserNotification("SecureTrade: Hold Suggestion! 📈", `Trend on ${t.symbol} is still strong. Option premium expected to rise.`);
                    playVoiceAlert("Hold position! Trend is strong.");
                  } else {
                    setBotStatus(`⚠️ 15-Min Advisor Warning: Trend on ${t.symbol} is weakening/reversing. Consider squaring off.`);
                    showBrowserNotification("SecureTrade: Trend Warning! ⚠️", `Trend on ${t.symbol} is weakening/reversing. Consider squaring off.`);
                    playVoiceAlert("Warning! Trend is weakening.");
                  }
                }

                const closePosition = async () => {
                  try {
                    const totalShares = (t.id === 1 ? b.maxLots : b.maxLots2) * posConfig.lotSize;
                    const endpoint = "sell"; // Always sell to exit options
                    const res = await fetch(`https://securetrade-n3qh.onrender.com/api/${endpoint}`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${b.token}` },
                      body: JSON.stringify({
                        symbol: t.symbol,
                        quantity: totalShares,
                        price: currentPremium
                      })
                    });
                    if (res.ok) {
                      const data = await res.json();
                      updateBalanceRef.current(data.newBalance);
                    }
                  } catch (err: any) {
                    console.warn("Auto Exit Sell error:", err?.message || err);
                  }
                };

                const maxTarget = t.targetPct || 20;
                const maxSl = t.slPct || 15;
                
                let userTargetPrice: number | null = null;
                let userSlPrice: number | null = null;
                try {
                  const storedLimits = localStorage.getItem("st_active_limits");
                  if (storedLimits) {
                    const limits = JSON.parse(storedLimits);
                    const limit = limits[t.symbol];
                    if (limit) {
                      userTargetPrice = limit.target;
                      userSlPrice = limit.sl;
                    }
                  }
                } catch {}

                let targetHit = false;
                let slHit = false;

                // Both CE and PE are bought options, so Target is always upward and SL is always downward
                if (userTargetPrice && userTargetPrice > 0) {
                  targetHit = currentPremium >= userTargetPrice;
                } else {
                  targetHit = pnlPercent >= maxTarget;
                }

                if (userSlPrice && userSlPrice > 0) {
                  slHit = currentPremium <= userSlPrice;
                } else {
                  slHit = pnlPercent <= -maxSl;
                }

                if (targetHit || slHit) {
                  const isTarget = targetHit;
                  setBotStatus(`${isTarget ? "🎯 Target" : "🚨 Stop-Loss"} Hit! Selling ${t.symbol} @ ₹${currentPremium.toFixed(2)} (${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(1)}%)`);
                  
                  // SYNCHRONOUSLY CLEAR POSITION STATE TO PREVENT WEB SOCKET TICK RACE CONDITIONS
                  if (t.id === 1) {
                    b.hasPosition = false;
                    b.entryPrice = 0;
                    b.entrySymbol = "";
                    b.maxPremium1 = 0;
                  } else {
                    b.hasSecondPosition = false;
                    b.entryPrice2 = 0;
                    b.entrySymbol2 = "";
                    b.maxPremium2 = 0;
                  }

                  await closePosition();
                  setBotNotification(null);
                  b.lastTradedSymbol = getIndexAndDirection(t.symbol);
                  b.lastExitTime = Date.now();

                  // Send SMS Notification Alert on exit
                  const exitMessage = `✅ [SecureTrade Alert] ${isTarget ? "🎯 Target" : "🚨 Stop-Loss"} Hit! Closed ${t.symbol} @ Suggested price ₹${currentPremium.toFixed(2)} (${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(1)}% P&L).`;
                  fetch("https://securetrade-n3qh.onrender.com/api/send-sms", {
                    method: "POST",
                    headers: { 
                      "Content-Type": "application/json", 
                      "Authorization": `Bearer ${token || b.token}` 
                    },
                    body: JSON.stringify({ message: exitMessage })
                  }).catch(err => console.error("SMS Exit Dispatch error:", err));

                  b.cooldown = true;
                  lastActionTime.current = Date.now();
                  
                  showBrowserNotification(
                    `SecureTrade: ${isTarget ? "🎯 Target Hit! 🏆" : "🚨 Stop-Loss Hit!"}`,
                    `Closed ${t.symbol} @ ₹${currentPremium.toFixed(2)} (${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(1)}%)`
                  );
                  playVoiceAlert(isTarget ? "Target Hit! Target Hit!" : "Stop Loss Hit! Stop Loss Hit!");
                  
                  setTimeout(() => { b.cooldown = false; }, 30000);
                } else {
                  if (!b.waitingForUser && !b.cooldown) {
                    let posStrategy: "crossover" | "5ema" | "gainz" = "crossover";
                    if (b.strategyMode === "auto") {
                      const targetMult = posActive.targetMultiplier ?? 1.8;
                      if (targetMult <= 1.3) posStrategy = "5ema";
                      else if (targetMult >= 2.4) posStrategy = "crossover";
                      else posStrategy = "gainz";
                    } else {
                      posStrategy = b.strategyMode as any;
                    }

                    const isMAStrongSell = posStrategy === "5ema"
                      ? (posActive.signal5ema || "").includes("SELL")
                      : (posStrategy === "gainz"
                         ? (posActive.signalGainz || "").includes("SELL")
                         : posActive.signal.includes("SELL"));

                    const isMAStrongBuy = posStrategy === "5ema"
                      ? (posActive.signal5ema || "").includes("BUY")
                      : (posStrategy === "gainz"
                         ? (posActive.signalGainz || "").includes("BUY")
                         : posActive.signal.includes("BUY"));
                    
                    const activeSignalLabel = posStrategy === "5ema"
                      ? posActive.signal5ema
                      : (posStrategy === "gainz" ? posActive.signalGainz : posActive.signal);
                    
                    if (isCall) {
                      if ((posRsi < 35 || isMAStrongBuy) && pnlPercent < -6 && elapsedSeconds > 25 && !t.hasRecommendedAveraging) {
                        const avgCost = currentPremium * posConfig.lotSize;
                        if (balanceRef.current < avgCost) {
                          console.log("Insufficient funds to average normal trade");
                        } else {
                          b.waitingForUser = true;
                          if (t.id === 1) b.hasRecommendedAveraging = true;
                          else b.hasRecommendedAveraging2 = true;

                          setBotNotification({
                            id: Date.now().toString(),
                            symbol: t.symbol,
                            type: "CE",
                            strike,
                            premium: currentPremium,
                            action: "BUY_MORE",
                            reason: `📈 Market support is strong at ₹${posSpot.toFixed(0)} (RSI: ${posRsi.toFixed(1)} & Trend: ${activeSignalLabel}). Suggesting BUY MORE (Average) to maximize potential profit.`,
                            timestamp: new Date()
                          });
                          setBotStatus(`🔔 Recommendation: Average Position! Buy more ${t.symbol}`);
                          showBrowserNotification("SecureTrade: Averaging Suggestion! 📈", `Suggesting average for ${t.symbol} @ ₹${currentPremium.toFixed(2)}`);
                          playVoiceAlert("Average trade! Average trade!");
                        }
                      }
                    } else {
                      if ((posRsi > 65 || isMAStrongSell) && pnlPercent < -6 && elapsedSeconds > 25 && !t.hasRecommendedAveraging) {
                        const avgCost = currentPremium * posConfig.lotSize;
                        if (balanceRef.current < avgCost) {
                          console.log("Insufficient funds to average normal trade");
                        } else {
                          b.waitingForUser = true;
                          if (t.id === 1) b.hasRecommendedAveraging = true;
                          else b.hasRecommendedAveraging2 = true;

                          setBotNotification({
                            id: Date.now().toString(),
                            symbol: t.symbol,
                            type: "PE",
                            strike,
                            premium: currentPremium,
                            action: "BUY_MORE",
                            reason: `📉 Market resistance is strong at ₹${posSpot.toFixed(0)} (RSI: ${posRsi.toFixed(1)} & Trend: ${activeSignalLabel}). Suggesting BUY MORE (Average) to maximize potential profit.`,
                            timestamp: new Date()
                          });
                          setBotStatus(`🔔 Recommendation: Average Position! Buy more ${t.symbol}`);
                          showBrowserNotification("SecureTrade: Averaging Suggestion! 📉", `Suggesting average for ${t.symbol} @ ₹${currentPremium.toFixed(2)}`);
                          playVoiceAlert("Average trade! Average trade!");
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }

        // --------------------------------------------
        // Zero-Hero Trade Exit Monitor
        // --------------------------------------------
        if (b.hasZeroHeroPosition && b.zhEntryPrice > 0) {
          const posUnderlying = b.zhEntrySymbol.split(/\s+/)[0];
          const posActive = formatted[posUnderlying];

          if (posActive && posActive.price) {
            const posConfig = SYMBOL_CONFIG[posUnderlying] || SYMBOL_CONFIG.NIFTY50;
            const parts = b.zhEntrySymbol.split(/\s+/);
            const typeIdx = parts.findIndex(p => p === "CE" || p === "PE");
            const strike = typeIdx !== -1 ? parseFloat(parts[typeIdx - 1]) : NaN;

            if (!isNaN(strike)) {
              let currentPremium = lastZhOptionPremium.current;
              let gotRealPrice = false;
              
              if (Date.now() - lastZhOptionFetchTime.current >= 3000 && !fetchingZhOptionRef.current) {
                fetchingZhOptionRef.current = true;
                lastZhOptionFetchTime.current = Date.now();
                try {
                  const ltpRes = await fetch(`https://securetrade-n3qh.onrender.com/api/option-ltp`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ symbol: b.zhEntrySymbol })
                  });
                  if (ltpRes.ok) {
                    const ltpData = await ltpRes.json();
                    if (ltpData.ltp && ltpData.ltp > 0) {
                      currentPremium = ltpData.ltp;
                      lastZhOptionPremium.current = ltpData.ltp;
                      gotRealPrice = true;
                    }
                  }
                } catch {} finally {
                  fetchingZhOptionRef.current = false;
                }
              }

              if (!gotRealPrice) {
                currentPremium = lastZhOptionPremium.current || b.zhEntryPrice;
              }

              // 🛡️ GLITCH GUARD: 10-second grace period after ZH entry
              const zhMsSinceEntry = Date.now() - b.zhEntryTime;
              if (zhMsSinceEntry < 10000) return;

              // 🛡️ GLITCH GUARD: Sanity check - reject impossible price spikes for ZH
              if (currentPremium > b.zhEntryPrice * 3.0 || currentPremium < b.zhEntryPrice * 0.1) {
                console.warn(`🚨 [ZH Glitch Guard] Suspicious price ₹${currentPremium.toFixed(2)} rejected for ${b.zhEntrySymbol} (entry ₹${b.zhEntryPrice.toFixed(2)}). Skipping ZH target/SL check.`);
                return;
              }

              if (currentPremium) {
                if (!b.hasZeroHeroPosition || b.zhEntryPrice <= 0) return;
                const pnlPercent = ((currentPremium - b.zhEntryPrice) / b.zhEntryPrice) * 100;

                                const closePosition = async () => {
                  try {
                    const totalShares = b.zhMaxLots * posConfig.lotSize;
                    const endpoint = "sell"; // Always sell to close options
                    const res = await fetch(`https://securetrade-n3qh.onrender.com/api/${endpoint}`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${b.token}` },
                      body: JSON.stringify({
                        symbol: b.zhEntrySymbol,
                        quantity: totalShares,
                        price: currentPremium
                      })
                    });
                    if (res.ok) {
                      const data = await res.json();
                      updateBalanceRef.current(data.newBalance);
                    }
                  } catch (err: any) {
                    console.warn("Auto Exit Sell error:", err?.message || err);
                  }
                };

                const maxTarget = b.zhTargetPct || 150;
                const maxSl = b.zhSlPct || 80;
                
                let userTargetPrice: number | null = null;
                let userSlPrice: number | null = null;
                try {
                  const storedLimits = localStorage.getItem("st_active_limits");
                  if (storedLimits) {
                    const limits = JSON.parse(storedLimits);
                    const limit = limits[b.zhEntrySymbol];
                    if (limit) {
                      userTargetPrice = limit.target;
                      userSlPrice = limit.sl;
                    }
                  }
                } catch {}

                let targetHit = false;
                let slHit = false;

                // Both CE and PE are bought options, so Target is upward and SL is downward
                if (userTargetPrice && userTargetPrice > 0) {
                  targetHit = currentPremium >= userTargetPrice;
                } else {
                  targetHit = pnlPercent >= maxTarget;
                }

                if (userSlPrice && userSlPrice > 0) {
                  slHit = currentPremium <= userSlPrice;
                } else {
                  slHit = pnlPercent <= -maxSl;
                }

                if (targetHit || slHit) {
                  const isTarget = targetHit;
                  setBotStatus(`⚡ Zero-Hero ${isTarget ? "🎯 Target" : "🚨 Stop-Loss"} Hit! Selling ${b.zhEntrySymbol} @ ₹${currentPremium.toFixed(2)} (${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(1)}%)`);
                  
                  // SYNCHRONOUSLY CLEAR STATE BEFORE AWAIT TO PREVENT WEB SOCKET TICK RACE CONDITIONS
                  b.hasZeroHeroPosition = false;
                  b.zhEntryPrice = 0;

                  await closePosition();
                  b.lastTradedSymbol = getIndexAndDirection(b.zhEntrySymbol);
                  b.lastExitTime = Date.now();
                  b.cooldown = true;
                  lastActionTime.current = Date.now();
                  
                  showBrowserNotification(
                    `SecureTrade: ZH ${isTarget ? "🎯 Target Hit!" : "🚨 Stop-Loss Hit!"}`,
                    `Closed Zero-Hero ${b.zhEntrySymbol} @ ₹${currentPremium.toFixed(2)} (${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(1)}%)`
                  );
                  playVoiceAlert(isTarget ? "Target Hit! Target Hit!" : "Stop Loss Hit! Stop Loss Hit!");
                  
                  setTimeout(() => { b.cooldown = false; }, 30000);
                }
              }
            }
          }
        }

        // ============================================
        // CASE 1: Signal scanning
        // ============================================
        let zhSignalFound = false;
        let normalSignalFound = false;

        const isGlobalCooldownActive = (Date.now() - lastResolvedEntryTime.current) < 60000;

        // Only scan for signals and show popup alerts when the market is open and bot is active
        if (isMarketOpen && b.active && !isGlobalCooldownActive && !b.waitingForUser && !b.cooldown) {
          let scanSymbols = b.enabledSymbols || ["NIFTY50", "BANKNIFTY", "SENSEX"];

          // 1. Scan for Zero-Hero (if Zero-Hero is enabled and we don't have a ZH position)
          if (b.isZeroHeroActive && !b.hasZeroHeroPosition) {
            let gotZH = false;
            for (const symToScan of scanSymbols) {
              if (gotZH) break;
              
              const activeSymbolData = formatted[symToScan];
              if (!activeSymbolData || !activeSymbolData.price) continue;

              const spot = activeSymbolData.price;
              const rsi = activeSymbolData.rsi;
              const config = SYMBOL_CONFIG[symToScan] || SYMBOL_CONFIG.NIFTY50;
              const atm = Math.round(spot / config.step) * config.step;
              const dte = getDte(symToScan);
              const expiryDateForLabel = getExpiryDate(symToScan);

              const d = new Date();
              const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
              const today = new Date(utc + (3600000 * 5.5));
              const dayOfWeek = today.getDay();
              const hours = today.getHours();
              const minutes = today.getMinutes();
              const timeVal = hours * 100 + minutes;

              const isTargetExpiryDay = (dayOfWeek === 4 && symToScan === "SENSEX") || (dayOfWeek === 2 && symToScan === "NIFTY50");
              const isZHTime = isTargetExpiryDay && timeVal >= 1230;

              if (isZHTime) {
                const ema9 = activeSymbolData.ema9;
                const ema21 = activeSymbolData.ema21;
                const prevEma9 = activeSymbolData.prevEma9;
                const prevEma21 = activeSymbolData.prevEma21;

                let currentDirection: "CE" | "PE" | null = null;
                let currentReason = "";

                if (ema9 !== undefined && ema21 !== undefined && prevEma9 !== undefined && prevEma21 !== undefined) {
                  const isBullishCross = (prevEma9 <= prevEma21) && (ema9 > ema21);
                  const isBearishCross = (prevEma9 >= prevEma21) && (ema9 < ema21);

                  if (isBullishCross && rsi > 52) {
                    currentDirection = "CE";
                    currentReason = `⚡ Expiry Day Special Zero-Hero CE Breakout! Index crossover (EMA9 ${ema9.toFixed(1)} > EMA21 ${ema21.toFixed(1)}) & RSI expanding (${rsi.toFixed(1)} > 52). 📈`;
                  } else if (isBearishCross && rsi < 48) {
                    currentDirection = "PE";
                    currentReason = `⚡ Expiry Day Special Zero-Hero PE Breakdown! Index crossover (EMA9 ${ema9.toFixed(1)} < EMA21 ${ema21.toFixed(1)}) & RSI contracting (${rsi.toFixed(1)} < 48). 📉`;
                  }
                }

                if (currentDirection) {
                  const isCall = currentDirection === "CE";
                  const expiryLabel = expiryDateForLabel.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }).toUpperCase();
                  
                  // OTM Strike scan for ₹5 to ₹25 premium sweet spot
                  const stepDirection = isCall ? 1 : -1;
                  let foundStrike = 0;
                  let foundPremium = 0;
                  let foundSym = "";
                  let gotOptionPrice = false;

                  for (let i = 0; i <= 12; i++) {
                    const currentStrike = atm + (i * config.step * stepDirection);
                    const currentSym = `${symToScan} ${expiryLabel} ${currentStrike} ${currentDirection}`;
                    
                    let currentPremium = 0;
                    let optionLtpOk = false;
                    try {
                      const ltpRes = await fetch(`https://securetrade-n3qh.onrender.com/api/option-ltp`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ symbol: currentSym })
                      });
                      if (ltpRes.ok) {
                        const ltpData = await ltpRes.json();
                        if (ltpData.ltp && ltpData.ltp > 0) {
                          currentPremium = ltpData.ltp;
                          optionLtpOk = true;
                        }
                      }
                    } catch {}

                    if (!optionLtpOk) {
                      currentPremium = calcPremium(spot, currentStrike, dte, isCall, config.iv);
                    }

                    if (currentPremium >= 5 && currentPremium <= 25) {
                      foundStrike = currentStrike;
                      foundPremium = currentPremium;
                      foundSym = currentSym;
                      gotOptionPrice = optionLtpOk;
                      break;
                    }
                  }

                  if (foundSym) {
                    const isReEntry = b.lastTradedSymbol === getIndexAndDirection(foundSym) && (Date.now() - b.lastExitTime) < 180000;
                    const minCost = foundPremium * config.lotSize;

                    if (!isReEntry && balanceRef.current >= minCost) {
                      gotZH = true;
                      zhSignalFound = true;
                      b.waitingForUser = true;
                      b.zhEntrySymbol = foundSym;
                      b.zhEntryPrice = foundPremium;

                      setBotNotification({
                        id: Date.now().toString(),
                        symbol: foundSym,
                        type: currentDirection,
                        strike: foundStrike,
                        premium: foundPremium,
                        reason: currentReason,
                        timestamp: new Date(),
                        targetPct: 150,
                        slPct: 80,
                        isZeroHero: true
                      });
                      setBotStatus(`🔔 Zero-Hero Signal! ${currentDirection === "CE" ? "📈 BULLISH" : "📉 BEARISH"} - ${foundSym} @ ₹${foundPremium.toFixed(2)}`);
                      showBrowserNotification("SecureTrade: Zero-Hero Trade Signal! 🚀", `Closed ${foundSym} @ ₹${foundPremium.toFixed(2)}`);
                      playVoiceAlert("Trade! Trade! Trade!");
                    }
                  }
                }
              }
            }
          }

          // 2. Scan for Normal Trade (allow up to 2 concurrent normal trades of same trend if 1st trade has been running for > 15 mins)
          const canOpenSecondPos = b.hasPosition && !b.hasSecondPosition && (Date.now() - b.entryTime > 15 * 60 * 1000);
          if (!zhSignalFound) {
            let gotNormal = false;
            for (const symToScan of scanSymbols) {
              if (gotNormal) break;

              const activeSymbolData = formatted[symToScan];
              if (!activeSymbolData || !activeSymbolData.price) continue;

              const spot = activeSymbolData.price;
              const rsi = activeSymbolData.rsi;
              const config = SYMBOL_CONFIG[symToScan] || SYMBOL_CONFIG.NIFTY50;
              const atm = Math.round(spot / config.step) * config.step;
              const dte = getDte(symToScan);
              const expiryDateForLabel = getExpiryDate(symToScan);

              let activeStrategy: "crossover" | "5ema" | "gainz" = "crossover";
              if (b.strategyMode === "auto") {
                const targetMult = activeSymbolData.targetMultiplier ?? 1.8;
                if (targetMult <= 1.3) {
                  activeStrategy = "5ema";
                } else if (targetMult >= 2.4) {
                  activeStrategy = "crossover";
                } else {
                  activeStrategy = "gainz";
                }
              } else {
                activeStrategy = b.strategyMode as any;
              }

              // Check regular strategy signals
              const isMAStrongSell = activeStrategy === "5ema"
                ? (activeSymbolData.signal5ema || "").includes("SELL")
                : (activeStrategy === "gainz"
                   ? (activeSymbolData.signalGainz || "").includes("SELL")
                   : activeSymbolData.signal.includes("SELL"));
              const isMAStrongBuy = activeStrategy === "5ema"
                ? (activeSymbolData.signal5ema || "").includes("BUY")
                : (activeStrategy === "gainz"
                   ? (activeSymbolData.signalGainz || "").includes("BUY")
                   : activeSymbolData.signal.includes("BUY"));

              let currentDirection: "CE" | "PE" | null = null;
              let currentReason = "";

              // Smart Recovery Filter: Stricter entry if last trade was a loss
              let isSignalValid = true;
              if (b.lastTradeWasLoss) {
                if (isMAStrongBuy && rsi <= 54) {
                  isSignalValid = false;
                  console.log(`🛡️ [Smart Recovery] Filtered CE signal on ${symToScan} due to moderate RSI (${rsi.toFixed(1)} <= 54). Waiting for higher confidence.`);
                } else if (isMAStrongSell && rsi >= 46) {
                  isSignalValid = false;
                  console.log(`🛡️ [Smart Recovery] Filtered PE signal on ${symToScan} due to moderate RSI (${rsi.toFixed(1)} >= 46). Waiting for higher confidence.`);
                }
              }

              if (isSignalValid) {
                if (isMAStrongBuy) {
                  currentDirection = "CE";
                  if (activeStrategy === "5ema") {
                    const tPct = activeSymbolData.targetPct5ema || 20;
                    const sPct = activeSymbolData.slPct5ema || 15;
                    currentReason = `⚡ Power of Stocks 5EMA CE Breakout! Target: +${tPct.toFixed(0)}% | Stop-Loss: -${sPct.toFixed(0)}% (1:3 Risk-Reward Ratio) 📈`;
                  } else if (activeStrategy === "gainz") {
                    currentReason = `⚡ Gainz Algo Suite Buy Signal! Index crossed above 9 EMA with strong momentum (RSI: ${rsi.toFixed(1)}). Buying Call (CE)! 📈`;
                  } else {
                    currentReason = `${symToScan.replace("NIFTY50", "NIFTY")} Trend Signal: ${activeSymbolData.signal} (RSI: ${rsi.toFixed(1)}). Crossover confirmed trend support. Buying Call (CE)! 📈`;
                  }
                } else if (isMAStrongSell) {
                  currentDirection = "PE";
                  if (activeStrategy === "5ema") {
                    const tPct = activeSymbolData.targetPct5ema || 20;
                    const sPct = activeSymbolData.slPct5ema || 15;
                    currentReason = `⚡ Power of Stocks 5EMA PE Breakdown! Target: +${tPct.toFixed(0)}% | Stop-Loss: -${sPct.toFixed(0)}% (1:3 Risk-Reward Ratio) 📉`;
                  } else if (activeStrategy === "gainz") {
                    currentReason = `⚡ Gainz Algo Suite Sell Signal! Index crossed below 9 EMA with weak momentum (RSI: ${rsi.toFixed(1)}). Buying Put (PE)! 📉`;
                  } else {
                    currentReason = `${symToScan.replace("NIFTY50", "NIFTY")} Trend Signal: ${activeSymbolData.signal} (RSI: ${rsi.toFixed(1)}). Crossover confirmed trend resistance. Buying Put (PE)! 📉`;
                  }
                }
              }

              if (currentDirection) {
                // Check for Trend Reversal: if we have an active position, and the new signal is in the opposite direction
                const activeIndex1 = b.entrySymbol ? b.entrySymbol.split(" ")[0] : "";
                if (b.hasPosition && activeIndex1 === symToScan) {
                  const existingDirection = b.isShort ? "PE" : "CE";
                  if (currentDirection !== existingDirection) {
                    console.log(`🔄 [Trend Reversal] Opposite signal (${currentDirection}) detected against existing position (${existingDirection}) on ${symToScan}. Executing early exit...`);
                    
                    // Exit Position 2 if active and index matches
                    if (b.hasSecondPosition) {
                      const activeIndex2 = b.entrySymbol2 ? b.entrySymbol2.split(" ")[0] : "";
                      if (activeIndex2 === symToScan) {
                        // SYNCHRONOUSLY CLEAR STATE BEFORE FETCH TO PREVENT TICK RACE CONDITIONS
                        b.hasSecondPosition = false;
                        const savedEntrySymbol2 = b.entrySymbol2;
                        const savedEntryPrice2 = b.entryPrice2;
                        const savedMaxLots2 = b.maxLots2;
                        b.entryPrice2 = 0;
                        b.entrySymbol2 = "";
                        b.maxPremium2 = 0;

                        try {
                          const configForExit2 = SYMBOL_CONFIG[symToScan] || SYMBOL_CONFIG.NIFTY50;
                          let exitPremium2 = savedEntryPrice2;
                          const ltpRes2 = await fetch(`https://securetrade-n3qh.onrender.com/api/option-ltp`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ symbol: savedEntrySymbol2 })
                          });
                          if (ltpRes2.ok) {
                            const ltpData2 = await ltpRes2.json();
                            // 🛡️ GLITCH GUARD: Only use price if it's within sane range
                            if (ltpData2.ltp && ltpData2.ltp > 0 && ltpData2.ltp < savedEntryPrice2 * 2.5 && ltpData2.ltp > savedEntryPrice2 * 0.25) {
                              exitPremium2 = ltpData2.ltp;
                            }
                          }

                          const totalShares2 = savedMaxLots2 * configForExit2.lotSize;
                          const endpoint2 = "sell"; // Always sell
                          
                          const exitRes2 = await fetch(`https://securetrade-n3qh.onrender.com/api/${endpoint2}`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${b.token}` },
                            body: JSON.stringify({
                              symbol: savedEntrySymbol2,
                              quantity: totalShares2,
                              price: exitPremium2
                            })
                          });
                          if (exitRes2.ok) {
                            const exitData2 = await exitRes2.json();
                            updateBalanceRef.current(exitData2.newBalance);
                            
                            const pnl2 = ((exitPremium2 - savedEntryPrice2) / savedEntryPrice2) * 100;
                            const earlyExitMessage2 = `⚠️ [SecureTrade Alert] Early Reversal Exit! Closed ${savedEntrySymbol2} @ Suggested price ₹${exitPremium2.toFixed(2)} (${pnl2 >= 0 ? "+" : ""}${pnl2.toFixed(1)}% P&L) due to trend shift.`;
                            fetch("https://securetrade-n3qh.onrender.com/api/send-sms", {
                              method: "POST",
                              headers: { 
                                "Content-Type": "application/json", 
                                "Authorization": `Bearer ${token || b.token}` 
                              },
                              body: JSON.stringify({ message: earlyExitMessage2 })
                            }).catch(err => console.error("SMS Early Exit 2 Dispatch error:", err));
                          }
                        } catch (err: any) {
                          console.error("Trend reversal early exit for position 2 failed:", err);
                        }
                      }
                    }

                    // Exit Position 1
                    if (b.hasPosition) {
                      const activeIndex1 = b.entrySymbol ? b.entrySymbol.split(" ")[0] : "";
                      if (activeIndex1 === symToScan) {
                        // SYNCHRONOUSLY CLEAR STATE BEFORE FETCH TO PREVENT TICK RACE CONDITIONS
                        b.hasPosition = false;
                        const savedEntrySymbol = b.entrySymbol;
                        const savedEntryPrice = b.entryPrice;
                        const savedMaxLots = b.maxLots;
                        b.entryPrice = 0;
                        b.entrySymbol = "";
                        b.maxPremium1 = 0;

                        try {
                          const configForExit = SYMBOL_CONFIG[symToScan] || SYMBOL_CONFIG.NIFTY50;
                          let exitPremium = savedEntryPrice;
                          const ltpRes = await fetch(`https://securetrade-n3qh.onrender.com/api/option-ltp`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ symbol: savedEntrySymbol })
                          });
                          if (ltpRes.ok) {
                            const ltpData = await ltpRes.json();
                            // 🛡️ GLITCH GUARD: Only use price if it's within sane range
                            if (ltpData.ltp && ltpData.ltp > 0 && ltpData.ltp < savedEntryPrice * 2.5 && ltpData.ltp > savedEntryPrice * 0.25) {
                              exitPremium = ltpData.ltp;
                            }
                          }

                          const totalShares = savedMaxLots * configForExit.lotSize;
                          const endpoint = "sell"; // Always sell
                          
                          setBotStatus(`🔄 Reversal Alert! Executing early exit on ${savedEntrySymbol} @ ₹${exitPremium.toFixed(2)} before switching trend...`);
                          
                          const exitRes = await fetch(`https://securetrade-n3qh.onrender.com/api/${endpoint}`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${b.token}` },
                            body: JSON.stringify({
                              symbol: savedEntrySymbol,
                              quantity: totalShares,
                              price: exitPremium
                            })
                          });
                          if (exitRes.ok) {
                            const exitData = await exitRes.json();
                            updateBalanceRef.current(exitData.newBalance);
                            
                            const pnl = ((exitPremium - savedEntryPrice) / savedEntryPrice) * 100;
                            const earlyExitMessage = `⚠️ [SecureTrade Alert] Early Reversal Exit! Closed ${savedEntrySymbol} @ Suggested price ₹${exitPremium.toFixed(2)} (${pnl >= 0 ? "+" : ""}${pnl.toFixed(1)}% P&L) due to trend shift.`;
                            fetch("https://securetrade-n3qh.onrender.com/api/send-sms", {
                              method: "POST",
                              headers: { 
                                "Content-Type": "application/json", 
                                "Authorization": `Bearer ${token || b.token}` 
                              },
                              body: JSON.stringify({ message: earlyExitMessage })
                            }).catch(err => console.error("SMS Early Exit Dispatch error:", err));
                            
                            showBrowserNotification("SecureTrade: Early Reversal Exit! 🔄", `Closed ${savedEntrySymbol} @ ₹${exitPremium.toFixed(2)} due to trend shift.`);
                            playVoiceAlert("Trend shifted! Closed position.");
                          }
                        } catch (err: any) {
                          console.error("Trend reversal early exit failed:", err);
                        }
                      }
                    }
                  }
                }
                const expiryLabel = expiryDateForLabel.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }).toUpperCase();
                
                // Determine if signal is 99% Surety (EMA alignment + strong RSI breakout)
                let isHighConfidence = false;
                if (currentDirection === "CE") {
                  const hasEmaAlignment = activeSymbolData.ema9 && activeSymbolData.ema21 && spot > activeSymbolData.ema9 && activeSymbolData.ema9 > activeSymbolData.ema21;
                  const isRsiBullish = rsi > 56 && rsi < 70;
                  const isTrendStrong = (activeSymbolData.targetMultiplier || 1.8) > 1.3;
                  if (hasEmaAlignment && isRsiBullish && isTrendStrong) {
                    isHighConfidence = true;
                  }
                } else if (currentDirection === "PE") {
                  const hasEmaAlignment = activeSymbolData.ema9 && activeSymbolData.ema21 && spot < activeSymbolData.ema9 && activeSymbolData.ema9 < activeSymbolData.ema21;
                  const isRsiBearish = rsi < 44 && rsi > 30;
                  const isTrendStrong = (activeSymbolData.targetMultiplier || 1.8) > 1.3;
                  if (hasEmaAlignment && isRsiBearish && isTrendStrong) {
                    isHighConfidence = true;
                  }
                }

                // If not high confidence, restrict premium to botMaxPremium. Otherwise, allow high premiums.
                const maxAllowedPremium = isHighConfidence ? 10000 : botMaxPremium;
                
                let chosenStrike = atm;
                let premium = 0;
                let gotOptionPrice = false;
                let didSlideOTM = false;

                // Smart Strike Selection: slide Out-Of-The-Money (OTM) if premium exceeds maxAllowedPremium
                for (let offset = 0; offset < 6; offset++) {
                  let strikeCandidate = atm;
                  if (offset > 0) {
                    const directionMultiplier = currentDirection === "CE" ? 1 : -1;
                    strikeCandidate = atm + (offset * config.step * directionMultiplier);
                  }
                  
                  const symCandidate = `${symToScan} ${expiryLabel} ${strikeCandidate} ${currentDirection}`;
                  let candidatePremium = 0;
                  let gotPrice = false;
                  
                  try {
                    const ltpRes = await fetch(`https://securetrade-n3qh.onrender.com/api/option-ltp`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ symbol: symCandidate })
                    });
                    if (ltpRes.ok) {
                      const ltpData = await ltpRes.json();
                      if (ltpData.ltp && ltpData.ltp > 0) {
                        candidatePremium = ltpData.ltp;
                        gotPrice = true;
                      }
                    }
                  } catch {}

                  if (!gotPrice && !isMarketOpen) {
                    candidatePremium = calcPremium(spot, strikeCandidate, dte, currentDirection === "CE", config.iv);
                    gotPrice = true;
                  }

                  if (gotPrice) {
                    if (candidatePremium <= maxAllowedPremium || offset === 5) {
                      chosenStrike = strikeCandidate;
                      premium = candidatePremium;
                      gotOptionPrice = true;
                      if (offset > 0) didSlideOTM = true;
                      break;
                    }
                  }
                }

                if (!gotOptionPrice && isMarketOpen) {
                  continue; // Skip if we cannot get real-time price
                }

                const sym = `${symToScan} ${expiryLabel} ${chosenStrike} ${currentDirection}`;

                const defaultAtr = symToScan === "BANKNIFTY" ? 45 : (symToScan === "SENSEX" ? 50 : 15);
                const activeAtr = activeSymbolData.atr || defaultAtr;
                const targetMult = activeSymbolData.targetMultiplier || 1.8;
                const slMult = activeSymbolData.slMultiplier || 1.2;

                const delta = 0.55;
                const atrTargetIndexPoints = activeAtr * targetMult;
                const atrSlIndexPoints = activeAtr * slMult;
                const atrSlOptionPct = Math.max(6, Math.min(25, (atrSlIndexPoints * delta / premium) * 100));
                
                // Keep ratio based target: 1:3 for crossover, 1:2 for gainz
                const ratioMultiplier = activeStrategy === "gainz" ? 2.0 : 3.0;
                const atrTargetOptionPct = Math.max(12, Math.min(75, atrSlOptionPct * ratioMultiplier));

                let serverSlPct = activeSymbolData.slPct5ema || 15;
                let serverTargetPct = activeSymbolData.targetPct5ema || 45;
                
                if (activeSymbolData.slPct5ema && activeSymbolData.slPct5ema < 5.0) {
                  const indexSlPoints = spot * (activeSymbolData.slPct5ema / 100);
                  const optionSlPoints = indexSlPoints * 0.55;
                  serverSlPct = Math.max(10, Math.min(25, (optionSlPoints / premium) * 100));
                  serverTargetPct = serverSlPct * 3.0;
                }

                let localTargetPct = activeStrategy === "5ema"
                  ? serverTargetPct
                  : (b.targetMode === "probability" ? atrTargetOptionPct : (symToScan === "BANKNIFTY" ? 25 : 20));
                
                let localSlPct = activeStrategy === "5ema"
                  ? serverSlPct
                  : (b.targetMode === "probability" ? atrSlOptionPct : (symToScan === "BANKNIFTY" ? 15 : 15));

                const isReEntry = b.lastTradedSymbol === getIndexAndDirection(sym) && (Date.now() - b.lastExitTime) < 180000;
                const minCost = premium * config.lotSize;

                const isSecondPosAllowed = !b.hasPosition || (canOpenSecondPos && currentDirection === (b.isShort ? "PE" : "CE"));
                if (!isReEntry && balanceRef.current >= minCost && isSecondPosAllowed) {
                  gotNormal = true;
                  normalSignalFound = true;
                  b.waitingForUser = true;
                  if (!b.hasPosition) {
                    b.entrySymbol = sym;
                    b.entryPrice = premium;
                  }

                  let finalReason = "";
                  if (activeStrategy === "5ema") {
                    finalReason = `⚡ Power of Stocks 5EMA ${currentDirection === "CE" ? "CE Breakout" : "PE Breakdown"}! High risk-reward ratio active. Target Option: +${localTargetPct.toFixed(0)}% | SL Option: -${localSlPct.toFixed(0)}% (1:3 Risk-to-Reward on chart setup) 📈`;
                  } else if (b.targetMode === "probability") {
                    finalReason = `⚡ ${activeStrategy === "gainz" ? "Gainz" : "Crossover"} ATR Target: +${localTargetPct.toFixed(0)}% | SL: -${localSlPct.toFixed(0)}% (Volatility-adjusted using ATR ${activeAtr.toFixed(1)} & multipliers: T:${targetMult} S:${slMult}) 📈`;
                  } else {
                    finalReason = `⚡ ${activeStrategy === "gainz" ? "Gainz" : "Crossover"} Fixed Target: +${localTargetPct.toFixed(0)}% | SL: -${localSlPct.toFixed(0)}% 📈`;
                  }

                  // Prepend premium strategy tag
                  if (isHighConfidence) {
                    finalReason = `🚨 [99% SURETY CONVERGENCE] ${finalReason}`;
                  } else if (didSlideOTM) {
                    finalReason = `🛡️ [CAPITAL GUARD OTM SLIDE] ${finalReason}`;
                  } else {
                    finalReason = `💸 [LOW RISK NORMAL ENTRY] ${finalReason}`;
                  }

                  setBotNotification({
                    id: Date.now().toString(),
                    symbol: sym,
                    type: currentDirection,
                    strike: chosenStrike,
                    premium,
                    reason: finalReason,
                    timestamp: new Date(),
                    targetPct: localTargetPct,
                    slPct: localSlPct
                  });

                  setBotStatus(`🔔 Signal! ${currentDirection === "CE" ? "📈 BULLISH" : "📉 BEARISH"} - ${sym} @ ₹${premium.toFixed(2)}`);
                  showBrowserNotification("SecureTrade: New Trade Signal! 🚀", `${currentDirection === "CE" ? "📈 CALL (CE)" : "📉 PUT (PE)"} - ${sym} @ ₹${premium.toFixed(2)}`);
                  playVoiceAlert("Trade! Trade! Trade!");

                  // Send SMS Notification Alert (Disabled for raw signals to stop spam)
                  /*
                  const alertMessage = `⚠️ [SecureTrade Alert] ${currentDirection === "CE" ? "📈 BUY CALL (CE)" : "📉 BUY PUT (PE)"} - ${sym} at Suggested entry ₹${premium.toFixed(2)}! Target: ₹${(premium * (1 + localTargetPct / 100)).toFixed(2)} | SL: ₹${(premium * (1 - localSlPct / 100)).toFixed(2)}.`;
                  fetch("https://securetrade-n3qh.onrender.com/api/send-sms", {
                    method: "POST",
                    headers: { 
                      "Content-Type": "application/json", 
                      "Authorization": `Bearer ${token || b.token}` 
                    },
                    body: JSON.stringify({ message: alertMessage })
                  }).catch(err => console.error("SMS Dispatch error:", err));
                  */
                }
              }
            }
          }
        }

        // --------------------------------------------
        // Dynamic activeBotTrade & Bot Status String Updates
        // --------------------------------------------
        // 1. Dynamic activeBotTrade update matching selectedSymbol
        if (b.hasZeroHeroPosition && b.zhEntrySymbol === selectedSymbol) {
          setActiveBotTrade({
            symbol: b.zhEntrySymbol,
            entryPrice: b.zhEntryPrice,
            targetPrice: b.zhEntryPrice * (1 + b.zhTargetPct / 100),
            stopLossPrice: b.zhEntryPrice * (1 - b.zhSlPct / 100),
            entryTime: b.zhEntryTime
          });
        } else if (b.hasPosition && b.entrySymbol === selectedSymbol) {
          setActiveBotTrade({
            symbol: b.entrySymbol,
            entryPrice: b.entryPrice,
            targetPrice: b.entryPrice * (1 + b.targetPct / 100),
            stopLossPrice: b.entryPrice * (1 - b.slPct / 100),
            entryTime: b.entryTime
          });
        } else {
          setActiveBotTrade(null);
        }

        // 2. Combine and update bot status string showing active position details
        let statusStr = "";
        if (b.hasPosition && b.entryPrice > 0) {
          const currentNormalPrem = lastOptionPremium.current || b.entryPrice;
          const normalPnl = ((currentNormalPrem - b.entryPrice) / b.entryPrice) * 100;
          statusStr += `📊 Normal: ${b.entrySymbol.split(" ")[0]} (${normalPnl >= 0 ? "+" : ""}${normalPnl.toFixed(1)}%)`;
        }
        if (b.hasZeroHeroPosition && b.zhEntryPrice > 0) {
          const currentZHPercent = lastZhOptionPremium.current || b.zhEntryPrice;
          const zhPnl = ((currentZHPercent - b.zhEntryPrice) / b.zhEntryPrice) * 100;
          if (statusStr) statusStr += " | ";
          statusStr += `⚡ ZH: ${b.zhEntrySymbol.split(" ")[0]} (${zhPnl >= 0 ? "+" : ""}${zhPnl.toFixed(1)}%)`;
        }

        if (statusStr) {
          setBotStatus(statusStr);
        } else if (!zhSignalFound && !normalSignalFound && !b.waitingForUser && !b.cooldown) {
          if (b.isZeroHeroActive) {
            const d = new Date();
            const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
            const today = new Date(utc + (3600000 * 5.5));
            const dayOfWeek = today.getDay();
            const hours = today.getHours();
            const minutes = today.getMinutes();
            const timeVal = hours * 100 + minutes;
            
            let targetZeroHeroSymbol = dayOfWeek === 4 ? "SENSEX" : (dayOfWeek === 2 ? "NIFTY50" : "");
            if (targetZeroHeroSymbol && timeVal >= 1230) {
              setBotStatus(`⚡ Zero-Hero Scanning ${targetZeroHeroSymbol} Expiries & Normal strategy active on other indices`);
            } else {
              setBotStatus(`🔍 Scanning All Indices | Zero-Hero standby for ${targetZeroHeroSymbol || "expiry day"} afternoon`);
            }
          } else {
            const activeSymbolData = formatted[b.symbol];
            if (activeSymbolData) {
              setBotStatus(`🔍 Scanning NIFTY/BANKNIFTY/SENSEX | ${b.symbol.replace("NIFTY50", "NIFTY")} RSI: ${activeSymbolData.rsi.toFixed(1)}`);
            }
          }
        }
      };

      ws.onerror = () => {
        if (active) setBotStatus("❌ WebSocket error! Reconnecting...");
      };

      ws.onclose = () => {
        if (active) {
          console.log("WebSocket disconnected. Reconnecting in 3s...");
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      active = false;
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  return (
    <MarketContext.Provider value={{
      marketData, isAutoTradeActive, toggleAutoTrade,
      isZeroHeroActive, toggleZeroHero,
      selectedSymbol, setSelectedSymbol,
      botStatus, botNotification, clearNotification,
      botMaxLots, setBotMaxLots,
      botMaxPremium, setBotMaxPremium,
      isMarketOpen,
      activeBotTrade,
      syncPositionWithDb,
      strategyMode,
      setStrategyMode,
      targetMode,
      setTargetMode,
      requestNotificationPermission,
      triggerTestNotification,
      enabledSymbols,
      setEnabledSymbols,
      triggerTransactionLock
    }}>
      {children}
    </MarketContext.Provider>
  );
}

export function useMarket() {
  const ctx = useContext(MarketContext);
  if (!ctx) throw new Error("useMarket error");
  return ctx;
}