"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CandlestickSeries, LineSeries, createSeriesMarkers } from "lightweight-charts";
import { useMarket } from "@/context/MarketContext";

interface TradingChartProps {
  customSymbol?: string;
  onMarketUpdate?: (price: number, signal: string, rsi: number) => void;
}

const CONFIGS: Record<string, { step: number; iv: number }> = {
  NIFTY50:   { step: 50,  iv: 0.13 },
  BANKNIFTY: { step: 100, iv: 0.16 },
  SENSEX:    { step: 100, iv: 0.13 },
};

function calcOptionPremium(spot: number, strike: number, dte: number, isCall: boolean, iv: number): number {
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

function parseDteFromSymbol(symbol: string): number {
  const parts = symbol.trim().split(/\s+/);
  const typeIdx = parts.findIndex(p => p === "CE" || p === "PE");
  if (typeIdx === -1) return 1;
  
  const dateParts = parts.slice(1, typeIdx - 1);
  const dateStr = dateParts.join(" ");
  
  const expiryDate = new Date(dateStr);
  if (isNaN(expiryDate.getTime())) return 1;
  
  const expiryMidnight = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  const diffTime = expiryMidnight.getTime() - todayMidnight.getTime();
  const dte = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, dte);
}

function getLivePrice(symbol: string, marketData: Record<string, any>): number | null {
  if (marketData[symbol]) return marketData[symbol].price;
  const parts = symbol.trim().split(/\s+/);
  const underlying = parts[0];
  const typeIdx = parts.findIndex((p: string) => p === "CE" || p === "PE");
  if (typeIdx === -1) return null;
  const isCall = parts[typeIdx] === "CE";
  const strike = parseFloat(parts[typeIdx - 1]);
  if (isNaN(strike)) return null;
  const spot = marketData[underlying]?.price;
  if (!spot) return null;
  const cfg = CONFIGS[underlying] || { step: 50, iv: 0.13 };
  const dte = parseDteFromSymbol(symbol);
  return calcOptionPremium(spot, strike, dte, isCall, cfg.iv);
}

const getLocalToISTShift = (): number => 19800; // Shift by 5.5 hours to align with IST

function getSeed(symbol: string, range: string, timeframe: number) {
  // Use daily date string in the seed so the random walk shape is consistent for the current calendar day
  const dateStr = new Date().toISOString().split('T')[0];
  const str = `${symbol}_${range}_${timeframe}_${dateStr}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function createRandom(seed: number) {
  let s = seed;
  return function() {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Generates historical OHLC candles, MA averages, MACD waves, and Support/Resistance zone values
function generateHistoricalData(symbol: string, currentPrice: number, candleInterval: number, range: "Y" | "1M" | "1Y") {
  const now = Math.floor(Date.now() / 1000);
  const shift = getLocalToISTShift();
  
  const seed = getSeed(symbol, range, candleInterval);
  const rnd = createRandom(seed);
  
  // Get current date parts in Asia/Kolkata timezone
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(new Date());
  const day = parts.find(p => p.type === 'day')?.value || '12';
  const month = parts.find(p => p.type === 'month')?.value || '06';
  const year = parts.find(p => p.type === 'year')?.value || '2026';
  
  // 9:15 AM IST today in UTC epoch timestamp
  const todayStartTimeRaw = Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 3, 45, 0) / 1000;
  // 3:30 PM IST today in UTC epoch timestamp
  const closeTimeSeconds = Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 10, 0, 0) / 1000;
  
  const endGenerationTime = Math.min(now, closeTimeSeconds);
  let todayStartTime = todayStartTimeRaw;
  
  // If we are currently before 9:15 AM IST today, today's market is closed
  const isBeforeOpen = now < todayStartTimeRaw;
  
  const rawPoints: { time: number; value: number }[] = [];
  const startPrice = currentPrice * (1 + (rnd() * 0.03 - 0.015)); 
  let runningPrice = startPrice;

  if (range === "1Y") {
    // Generate daily candles for last 365 days (approx 250 trading days)
    const daySeconds = 86400;
    const start = Math.floor((now - 365 * daySeconds) / daySeconds) * daySeconds;
    let lastT = start;
    for (let i = 0; i < 250; i++) {
      const t = Math.floor((start + i * 1.46 * daySeconds) / daySeconds) * daySeconds;
      if (t >= now || (t <= lastT && i > 0)) continue;
      runningPrice = runningPrice + (rnd() - 0.5) * (currentPrice * 0.04);
      rawPoints.push({ time: t, value: runningPrice });
      lastT = t;
    }
  } else if (range === "1M") {
    // Generate 4-hour candles for last 30 days (spaced by 14400 seconds)
    const fourHourSeconds = 14400;
    const start = Math.floor((now - 30 * 86400) / fourHourSeconds) * fourHourSeconds;
    let lastT = start;
    for (let i = 0; i < 180; i++) {
      const t = start + i * fourHourSeconds;
      if (t >= now || (t <= lastT && i > 0)) continue;
      runningPrice = runningPrice + (rnd() - 0.5) * (currentPrice * 0.02);
      rawPoints.push({ time: t, value: runningPrice });
      lastT = t;
    }
  } else {
    // Range is "Y" (Yesterday + Today)
    // 1. Generate Yesterday's raw price values
    const todayDayOfWeek = new Date(todayStartTimeRaw * 1000).getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const daysBack = (todayDayOfWeek === 1) ? 3 : (todayDayOfWeek === 0 ? 2 : 1);
    const yesterdayStartTimeRaw = todayStartTimeRaw - daysBack * 86400;
    
    const yesterdaySpacing = Math.max(900, Math.floor(900 / candleInterval) * candleInterval);
    for (let t = yesterdayStartTimeRaw; t <= yesterdayStartTimeRaw + 22500; t += yesterdaySpacing) {
      runningPrice = runningPrice + (rnd() - 0.5) * (currentPrice * 0.0012);
      rawPoints.push({ time: t, value: runningPrice });
    }

    // 2. Generate Today's raw price values (aligned to selected timeframe steps)
    if (!isBeforeOpen) {
      const timeDiff = endGenerationTime - todayStartTime;
      const step = candleInterval;
      const numTodayCandles = Math.max(2, Math.floor(timeDiff / candleInterval));
      let lastT = yesterdayStartTimeRaw + 22500;
      for (let i = 0; i < numTodayCandles; i++) {
        const t = Math.floor((todayStartTime + i * step) / candleInterval) * candleInterval;
        if (t >= endGenerationTime || t <= lastT) continue;
        const progress = i / numTodayCandles;
        const targetPrice = startPrice + (currentPrice - startPrice) * progress;
        runningPrice = targetPrice + (rnd() - 0.5) * (currentPrice * 0.0008);
        rawPoints.push({ time: t, value: runningPrice });
        lastT = t;
      }
      
      const roundedNow = Math.floor(endGenerationTime / candleInterval) * candleInterval;
      if (roundedNow > lastT && roundedNow < closeTimeSeconds) {
        rawPoints.push({ time: roundedNow, value: currentPrice });
      }
    }
  }

  // Convert raw prices to Candlestick OHLC bars
  const candleData: any[] = [];
  let prevClose = startPrice;
  rawPoints.forEach((pt) => {
    const open = prevClose;
    const close = pt.value;
    const high = Math.max(open, close) + rnd() * (currentPrice * 0.0006);
    const low = Math.min(open, close) - rnd() * (currentPrice * 0.0006);
    candleData.push({
      time: pt.time + shift, // Apply timezone shift to force IST rendering
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100
    });
    prevClose = close;
  });

  // Calculate MA5 (5EMA) and MA20 (SMA20) overlay values
  const ma5Data: any[] = [];
  const ma20Data: any[] = [];
  const closes = candleData.map(c => c.close);
  let ema5Val = closes[0];
  const mult5 = 2 / (5 + 1);
  for (let i = 0; i < candleData.length; i++) {
    const t = candleData[i].time;
    if (i === 0) {
      ema5Val = closes[0];
    } else {
      ema5Val = (closes[i] - ema5Val) * mult5 + ema5Val;
    }
    ma5Data.push({ time: t, value: Math.round(ema5Val * 100) / 100 });

    const ma20Slice = closes.slice(Math.max(0, i - 19), i + 1);
    const ma20 = ma20Slice.reduce((a, b) => a + b, 0) / ma20Slice.length;
    ma20Data.push({ time: t, value: Math.round(ma20 * 100) / 100 });
  }

  // Dynamic Support & Resistance levels mapping
  const highs = candleData.map(c => c.high);
  const lows = candleData.map(c => c.low);
  const maxPrice = Math.max(...highs);
  const minPrice = Math.min(...lows);
  const priceRange = maxPrice - minPrice;
  const resistance = Math.round((maxPrice - priceRange * 0.06) * 100) / 100;
  const support = Math.round((minPrice + priceRange * 0.06) * 100) / 100;

  const markers = range === "Y" ? [
    {
      time: todayStartTime + shift, // Apply timezone shift
      position: 'aboveBar' as const,
      color: '#ef4444',
      shape: 'arrowDown' as const,
      text: '🔴 TODAY OPEN'
    }
  ] : [];

  const todayStartTimestamp = todayStartTime + shift;
  return { candleData, ma5Data, ma20Data, resistance, support, markers, todayStartTimestamp };
}

export default function TradingChart({ customSymbol, onMarketUpdate }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const ma5SeriesRef = useRef<any>(null);
  const ma20SeriesRef = useRef<any>(null);
  const markersRef = useRef<any>(null);

  // Price Line References to prevent duplicates
  const resLineRef = useRef<any>(null);
  const supLineRef = useRef<any>(null);
  const entryLineRef = useRef<any>(null);
  const targetLineRef = useRef<any>(null);
  const slLineRef = useRef<any>(null);
  const lastDrawnEntryPriceRef = useRef<number>(0);
  const todayHighLineRef = useRef<any>(null);
  const todayLowLineRef = useRef<any>(null);
  const todayHighValRef = useRef<number>(0);
  const todayLowValRef = useRef<number>(0);

  const lastTimeRef = useRef<number>(0);
  const currentCandleRef = useRef<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
  } | null>(null);
  const { marketData, selectedSymbol, activeBotTrade, isMarketOpen } = useMarket();
  const activeSymbol = customSymbol || selectedSymbol;
  const isIndex = activeSymbol === "NIFTY50" || activeSymbol === "SENSEX" || activeSymbol === "BANKNIFTY";
  
  const [realLtp, setRealLtp] = useState<number | null>(null);
  const [brokerHigh, setBrokerHigh] = useState<number | null>(null);
  const [brokerLow, setBrokerLow] = useState<number | null>(null);
  const [timeframe, setTimeframe] = useState<number>(5);
  const lastTimeframeRef = useRef<number>(5);
  const [range, setRange] = useState<"Y" | "1M" | "1Y">("Y");
  const lastRangeRef = useRef<"Y" | "1M" | "1Y">("Y");
  const lastSymbolRef = useRef<string>("");
  const mainLineSeriesRef = useRef<any>(null);
  const [chartType, setChartType] = useState<"candles" | "hollow" | "line">("candles");
  const lastChartTypeRef = useRef<"candles" | "hollow" | "line">("candles");

  let currentPrice = 0;
  if (isIndex) {
    currentPrice = marketData[activeSymbol]?.price || 0;
  } else {
    currentPrice = realLtp || getLivePrice(activeSymbol, marketData) || 0;
  }

  const [chartData, setChartData] = useState<any>(null);

  // Fetch real index/option historical candles from backend with PRNG mock fallback
  useEffect(() => {
    if (currentPrice === 0) return;
    
    let active = true;
    const loadHistoricalCandles = async () => {
      try {
        const res = await fetch(`https://securetrade-n3qh.onrender.com/api/historical-candles?symbol=${activeSymbol}&timeframe=${timeframe}&range=${range}`);
        if (!res.ok) throw new Error("API request failed");
        const data = await res.json();
        if (active && data && Array.isArray(data) && data.length > 0) {
          const shift = getLocalToISTShift();
          const formatted = data.map((c: any) => ({
            time: c.time + shift,
            open: Number(c.open),
            high: Number(c.high),
            low: Number(c.low),
            close: Number(c.close)
          }));
          setChartData({
            candleData: formatted,
            symbol: activeSymbol,
            timeframe,
            range,
            isMock: false
          });
        } else {
          throw new Error("Empty historical data");
        }
      } catch (err) {
        console.warn("⚠️ API historical candles fetch failed, falling back to mock generation:", err);
        const intervalSeconds = range === "1M" ? 86400 : timeframe * 60;
        const mock = generateHistoricalData(activeSymbol, currentPrice, intervalSeconds, range);
        if (active) {
          setChartData({
            candleData: mock.candleData,
            ma5Data: mock.ma5Data,
            ma20Data: mock.ma20Data,
            resistance: mock.resistance,
            support: mock.support,
            markers: mock.markers,
            symbol: activeSymbol,
            timeframe,
            range,
            isMock: true
          });
        }
      }
    };
    
    loadHistoricalCandles();
    return () => {
      active = false;
    };
  }, [activeSymbol, timeframe, range, currentPrice === 0]);

  useEffect(() => {
    if (isIndex) {
      setRealLtp(null);
      setBrokerHigh(null);
      setBrokerLow(null);
      return;
    }
    
    let active = true;
    const fetchLtp = async () => {
      try {
        const res = await fetch("https://securetrade-n3qh.onrender.com/api/option-ltp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol: activeSymbol })
        });
        if (res.ok) {
          const data = await res.json();
          if (active && data) {
            if (data.ltp !== undefined) setRealLtp(data.ltp);
            if (data.high !== undefined) setBrokerHigh(data.high);
            if (data.low !== undefined) setBrokerLow(data.low);
          }
        }
      } catch {}
    };
    
    fetchLtp();
    const interval = setInterval(fetchLtp, 3000); // Poll every 3s
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [activeSymbol, isIndex]);



  // 1. Draw chart layout in light theme
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    const initialWidth = container.clientWidth || 800;
    const initialHeight = container.clientHeight || 450;

    const chart = createChart(container, {
      layout: { 
        background: { type: ColorType.Solid, color: "#ffffff" }, 
        textColor: "#64748b" 
      },
      grid: { 
        vertLines: { color: "#f1f5f9" }, 
        horzLines: { color: "#f1f5f9" } 
      },
      width: initialWidth, 
      height: initialHeight, 
      timeScale: { 
        timeVisible: true, 
        secondsVisible: false,
        tickMarkFormatter: (time: any, tickMarkType: any) => {
          let date: Date;
          if (typeof time === "number") {
            date = new Date(time * 1000);
          } else if (time && typeof time === "object" && "year" in time) {
            date = new Date(Date.UTC(time.year, time.month - 1, time.day));
          } else {
            return "";
          }
          if (isNaN(date.getTime())) return "";

          if (tickMarkType === 0) {
            return new Intl.DateTimeFormat("en-GB", {
              timeZone: "UTC",
              year: "numeric"
            }).format(date);
          } else if (tickMarkType === 1) {
            return new Intl.DateTimeFormat("en-GB", {
              timeZone: "UTC",
              month: "short"
            }).format(date);
          } else if (tickMarkType === 2) {
            return new Intl.DateTimeFormat("en-GB", {
              timeZone: "UTC",
              day: "2-digit",
              month: "short"
            }).format(date);
          } else {
            return new Intl.DateTimeFormat("en-GB", {
              timeZone: "UTC",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false
            }).format(date);
          }
        }
      },
      localization: {
        timeFormatter: (time: any) => {
          let date: Date;
          if (typeof time === "number") {
            date = new Date(time * 1000);
          } else if (time && typeof time === "object" && "year" in time) {
            date = new Date(Date.UTC(time.year, time.month - 1, time.day));
          } else {
            return "";
          }
          if (isNaN(date.getTime())) return "";

          return new Intl.DateTimeFormat("en-GB", {
            timeZone: "UTC",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
          }).format(date);
        }
      }
    });
    chartRef.current = chart;

    // 1. Japanese Candlesticks Series
    const candleSeries = chart.addSeries(CandlestickSeries, { 
      upColor: "#10b981", 
      downColor: "#ef4444", 
      borderVisible: false, 
      wickUpColor: "#10b981", 
      wickDownColor: "#ef4444" 
    });
    candleSeriesRef.current = candleSeries;

    // 1b. Main Line Series (Hidden by default)
    const mainLineSeries = chart.addSeries(LineSeries, {
      color: "#2563eb",
      lineWidth: 2,
      priceLineVisible: true,
      visible: false
    });
    mainLineSeriesRef.current = mainLineSeries;

    // 2. SMA Overlay Lines (Thin transparent styling matching TradingView indicators)
    const ma5 = chart.addSeries(LineSeries, { 
      color: "rgba(37, 99, 235, 0.45)", 
      lineWidth: 1,
      priceLineVisible: false
    });
    ma5SeriesRef.current = ma5;

    const ma20 = chart.addSeries(LineSeries, { 
      color: "rgba(249, 115, 22, 0.45)", 
      lineWidth: 1,
      priceLineVisible: false
    });
    ma20SeriesRef.current = ma20;

    // 3. MACD Histogram Pane removed to fix overlap and stretching visual bugs

    const markersApi = createSeriesMarkers(candleSeries);
    markersRef.current = markersApi;

    // Responsive resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !entries[0].contentRect) return;
      const { width, height } = entries[0].contentRect;
      if (chartRef.current) {
        chart.resize(width, height || initialHeight);
      }
    });
    resizeObserver.observe(container);

    return () => { 
      resizeObserver.disconnect();
      chart.remove(); 
    };
  }, []);

  // 2. Update chart series from chartData
  useEffect(() => {
    if (!candleSeriesRef.current || !chartData) return;

    const isSwitched = lastSymbolRef.current !== chartData.symbol || 
                       lastTimeframeRef.current !== chartData.timeframe || 
                       lastRangeRef.current !== chartData.range || 
                       lastChartTypeRef.current !== chartType;

    if (isSwitched) {
      currentCandleRef.current = null;
      
      const { candleData, ma5Data, ma20Data, resistance, support, markers, isMock } = chartData;

      let finalMa5 = ma5Data;
      let finalMa20 = ma20Data;
      let finalResistance = resistance;
      let finalSupport = support;
      let finalMarkers = markers || [];

      if (!isMock) {
        // Calculate 5EMA and SMA20 from fetched candles
        finalMa5 = [];
        finalMa20 = [];
        const closes = candleData.map((c: any) => c.close);
        let ema5Val = closes[0];
        const mult5 = 2 / (5 + 1);
        for (let i = 0; i < candleData.length; i++) {
          const t = candleData[i].time;
          if (i === 0) {
            ema5Val = closes[0];
          } else {
            ema5Val = (closes[i] - ema5Val) * mult5 + ema5Val;
          }
          finalMa5.push({ time: t, value: Math.round(ema5Val * 100) / 100 });

          const ma20Slice = closes.slice(Math.max(0, i - 19), i + 1);
          const ma20Val = ma20Slice.reduce((a: any, b: any) => a + b, 0) / ma20Slice.length;
          finalMa20.push({ time: t, value: Math.round(ma20Val * 100) / 100 });
        }

        // MACD Histogram calculation removed to fix overlap and stretching visual bugs

        // Calculate Support/Resistance
        const highs = candleData.map((c: any) => c.high);
        const lows = candleData.map((c: any) => c.low);
        const maxPrice = Math.max(...highs);
        const minPrice = Math.min(...lows);
        const priceRange = maxPrice - minPrice;
        finalResistance = Math.round((maxPrice - priceRange * 0.06) * 100) / 100;
        finalSupport = Math.round((minPrice + priceRange * 0.06) * 100) / 100;

        // Draw Today Open marker for Range "Y"
        if (chartData.range === "Y") {
          const today = new Date();
          today.setHours(9, 15, 0, 0);
          const shift = getLocalToISTShift();
          const todayStartIST = Math.floor(today.getTime() / 1000) + shift;
          finalMarkers = [
            {
              time: todayStartIST,
              position: 'aboveBar' as const,
              color: '#ef4444',
              shape: 'arrowDown' as const,
              text: '🔴 TODAY OPEN'
            }
          ];
        }
      }

      if (chartType === "line") {
        candleSeriesRef.current.applyOptions({ visible: false });
        if (mainLineSeriesRef.current) mainLineSeriesRef.current.applyOptions({ visible: true });
      } else {
        if (mainLineSeriesRef.current) mainLineSeriesRef.current.applyOptions({ visible: false });
        candleSeriesRef.current.applyOptions({ visible: true });
        
        if (chartType === "hollow") {
          candleSeriesRef.current.applyOptions({
            upColor: "rgba(0, 0, 0, 0)",
            borderVisible: true,
            borderUpColor: "#10b981",
            borderDownColor: "#ef4444",
            wickUpColor: "#10b981",
            wickDownColor: "#ef4444",
            downColor: "#ef4444"
          });
        } else {
          candleSeriesRef.current.applyOptions({
            upColor: "#10b981",
            borderVisible: false,
            wickUpColor: "#10b981",
            wickDownColor: "#ef4444",
            downColor: "#ef4444"
          });
        }
      }

      const isIntraday = chartData.range === "Y";
      const todayStartTimestamp = chartData.todayStartTimestamp;

      const displayCandleData = (isIntraday && todayStartTimestamp)
        ? candleData.filter((c: any) => c.time >= todayStartTimestamp)
        : candleData;

      const displayMa5 = (isIntraday && todayStartTimestamp)
        ? finalMa5.filter((m: any) => m.time >= todayStartTimestamp)
        : finalMa5;

      const displayMa20 = (isIntraday && todayStartTimestamp)
        ? finalMa20.filter((m: any) => m.time >= todayStartTimestamp)
        : finalMa20;

      candleSeriesRef.current.setData(displayCandleData);
      if (mainLineSeriesRef.current) {
        mainLineSeriesRef.current.setData(displayCandleData.map((c: any) => ({ time: c.time, value: c.close })));
      }

      if (ma5SeriesRef.current) ma5SeriesRef.current.setData(displayMa5);
      if (ma20SeriesRef.current) ma20SeriesRef.current.setData(displayMa20);

      if (resLineRef.current) candleSeriesRef.current.removePriceLine(resLineRef.current);
      if (supLineRef.current) candleSeriesRef.current.removePriceLine(supLineRef.current);

      resLineRef.current = candleSeriesRef.current.createPriceLine({
        price: finalResistance,
        color: "rgba(239, 68, 68, 0.35)",
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: "🔴 RESISTANCE ZONE"
      });
      supLineRef.current = candleSeriesRef.current.createPriceLine({
        price: finalSupport,
        color: "rgba(16, 185, 129, 0.35)",
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: "🟢 SUPPORT ZONE"
      });

      if (markersRef.current) {
        markersRef.current.setMarkers(finalMarkers);
      }

      // Calculate Today's High and Low from the candleData
      const d = new Date();
      const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
      const ist = new Date(utc + (3600000 * 5.5));
      ist.setHours(0, 0, 0, 0);
      const todayMidnightIST = Math.floor(ist.getTime() / 1000);

      const todayCandles = candleData.filter((c: any) => c.time >= todayMidnightIST);
      let todayHighVal = 0;
      let todayLowVal = 0;

      if (brokerHigh && !isIndex) {
        todayHighVal = brokerHigh;
      } else if (todayCandles.length > 0) {
        todayHighVal = Math.max(...todayCandles.map((c: any) => c.high));
      } else {
        todayHighVal = Math.max(...candleData.map((c: any) => c.high));
      }

      if (brokerLow && !isIndex) {
        todayLowVal = brokerLow;
      } else if (todayCandles.length > 0) {
        todayLowVal = Math.min(...todayCandles.map((c: any) => c.low));
      } else {
        todayLowVal = Math.min(...candleData.map((c: any) => c.low));
      }

      todayHighValRef.current = todayHighVal;
      todayLowValRef.current = todayLowVal;

      if (todayHighLineRef.current) candleSeriesRef.current.removePriceLine(todayHighLineRef.current);
      if (todayLowLineRef.current) candleSeriesRef.current.removePriceLine(todayLowLineRef.current);

      todayHighLineRef.current = candleSeriesRef.current.createPriceLine({
        price: todayHighVal,
        color: "rgba(22, 163, 74, 0.55)",
        lineWidth: 1.5,
        lineStyle: 2, // Dotted
        axisLabelVisible: true,
        title: "📈 TODAY'S HIGH"
      });

      todayLowLineRef.current = candleSeriesRef.current.createPriceLine({
        price: todayLowVal,
        color: "rgba(220, 38, 38, 0.55)",
        lineWidth: 1.5,
        lineStyle: 2, // Dotted
        axisLabelVisible: true,
        title: "📉 TODAY'S LOW"
      });

      const lastPoint = candleData[candleData.length - 1];
      if (lastPoint) {
        lastTimeRef.current = typeof lastPoint.time === "number" ? lastPoint.time : Math.floor(Date.now() / 1000);
      }

      if (chartRef.current) {
        setTimeout(() => {
          if (chartRef.current) chartRef.current.timeScale().fitContent();
        }, 50);
      }

      lastSymbolRef.current = chartData.symbol;
      lastTimeframeRef.current = chartData.timeframe;
      lastRangeRef.current = chartData.range;
      lastChartTypeRef.current = chartType;
    } else {
      if (!isNaN(currentPrice) && currentPrice > 0 && isMarketOpen) {
        const intervalSeconds = range === "1M" ? 86400 : timeframe * 60;
        const shift = getLocalToISTShift();
        const barTime = Math.floor(Math.floor((Date.now() / 1000) + shift) / intervalSeconds) * intervalSeconds;
        const currentTime = Math.max(lastTimeRef.current, barTime);
        
        let candle = currentCandleRef.current;
        if (!candle || currentTime > candle.time) {
          const openPrice = candle ? candle.close : currentPrice;
          candle = {
            time: currentTime,
            open: openPrice,
            high: Math.max(openPrice, currentPrice),
            low: Math.min(openPrice, currentPrice),
            close: currentPrice
          };
          lastTimeRef.current = currentTime;
        } else {
          candle.high = Math.max(candle.high, currentPrice);
          candle.low = Math.min(candle.low, currentPrice);
          candle.close = currentPrice;
        }
        
        currentCandleRef.current = candle;
        
        candleSeriesRef.current.update({
          time: candle.time as any,
          open: Math.round(candle.open * 100) / 100,
          high: Math.round(candle.high * 100) / 100,
          low: Math.round(candle.low * 100) / 100,
          close: Math.round(candle.close * 100) / 100
        });

        if (mainLineSeriesRef.current) {
          mainLineSeriesRef.current.update({
            time: candle.time as any,
            value: Math.round(candle.close * 100) / 100
          });
        }

        if (ma5SeriesRef.current) ma5SeriesRef.current.update({ time: candle.time as any, value: Math.round(candle.close * 100) / 100 });
        if (ma20SeriesRef.current) ma20SeriesRef.current.update({ time: candle.time as any, value: Math.round(candle.close * 100) / 100 });

        // Update High/Low Lines dynamically on new highs/lows
        if (currentPrice > todayHighValRef.current) {
          todayHighValRef.current = currentPrice;
          if (todayHighLineRef.current) {
            candleSeriesRef.current.removePriceLine(todayHighLineRef.current);
          }
          todayHighLineRef.current = candleSeriesRef.current.createPriceLine({
            price: currentPrice,
            color: "rgba(22, 163, 74, 0.55)",
            lineWidth: 1.5,
            lineStyle: 2,
            axisLabelVisible: true,
            title: "📈 TODAY'S HIGH"
          });
        }
        if (currentPrice < todayLowValRef.current && currentPrice > 0) {
          todayLowValRef.current = currentPrice;
          if (todayLowLineRef.current) {
            candleSeriesRef.current.removePriceLine(todayLowLineRef.current);
          }
          todayLowLineRef.current = candleSeriesRef.current.createPriceLine({
            price: currentPrice,
            color: "rgba(220, 38, 38, 0.55)",
            lineWidth: 1.5,
            lineStyle: 2,
            axisLabelVisible: true,
            title: "📉 TODAY'S LOW"
          });
        }
      }
    }

    if (activeBotTrade && activeBotTrade.symbol === activeSymbol) {
      if (lastDrawnEntryPriceRef.current !== activeBotTrade.entryPrice) {
        if (entryLineRef.current) candleSeriesRef.current.removePriceLine(entryLineRef.current);
        if (targetLineRef.current) candleSeriesRef.current.removePriceLine(targetLineRef.current);
        if (slLineRef.current) candleSeriesRef.current.removePriceLine(slLineRef.current);
        entryLineRef.current = null;
        targetLineRef.current = null;
        slLineRef.current = null;
        lastDrawnEntryPriceRef.current = activeBotTrade.entryPrice;
      }

      if (!entryLineRef.current) {
        entryLineRef.current = candleSeriesRef.current.createPriceLine({
          price: activeBotTrade.entryPrice,
          color: "#16a34a",
          lineWidth: 2,
          lineStyle: 0,
          axisLabelVisible: true,
          title: "🔵 ENTRY LEVEL"
        });
      }

      if (!targetLineRef.current) {
        targetLineRef.current = candleSeriesRef.current.createPriceLine({
          price: activeBotTrade.targetPrice,
          color: "#2563eb",
          lineWidth: 2,
          lineStyle: 0,
          axisLabelVisible: true,
          title: "🎯 TARGET (TP)"
        });
      }

      if (!slLineRef.current) {
        slLineRef.current = candleSeriesRef.current.createPriceLine({
          price: activeBotTrade.stopLossPrice,
          color: "#dc2626",
          lineWidth: 2,
          lineStyle: 0,
          axisLabelVisible: true,
          title: "🚨 STOP LOSS (SL)"
        });
      }
    } else {
      if (entryLineRef.current) { candleSeriesRef.current.removePriceLine(entryLineRef.current); entryLineRef.current = null; }
      if (targetLineRef.current) { candleSeriesRef.current.removePriceLine(targetLineRef.current); targetLineRef.current = null; }
      if (slLineRef.current) { candleSeriesRef.current.removePriceLine(slLineRef.current); slLineRef.current = null; }
      lastDrawnEntryPriceRef.current = 0;
    }

  }, [chartData, currentPrice, chartType, activeBotTrade]);

  return (
    <div className="w-full h-full relative bg-white flex flex-col">
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50/20 flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
          <span className="text-green-600 font-extrabold text-xs tracking-wider uppercase">
            LIVE TICK: {activeSymbol.replace("NIFTY50", "NIFTY")} @ ₹{currentPrice.toFixed(2)}
          </span>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Chart Type Selector */}
          <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg text-xs font-bold">
            {(["candles", "hollow", "line"] as const).map((ct) => (
              <button
                key={ct}
                onClick={() => setChartType(ct)}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer capitalize ${
                  chartType === ct 
                    ? "bg-white text-blue-600 shadow-xs font-black" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {ct === "candles" ? "📊 Candles" : ct === "hollow" ? "🕯️ Hollow" : "📈 Line"}
              </button>
            ))}
          </div>

          {/* Range Selector */}
          <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg text-xs font-bold">
            {(["Y", "1M", "1Y"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  range === r 
                    ? "bg-white text-blue-600 shadow-xs font-black" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {r === "Y" ? "Yesterday" : r === "1M" ? "1 Month" : "1 Year"}
              </button>
            ))}
          </div>

          {/* Timeframe Selector (Disabled/Visualized as Daily if range is 1M or 1Y) */}
          {range === "Y" ? (
            <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg text-xs font-bold">
              {([1, 3, 5, 15, 30] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    timeframe === tf 
                      ? "bg-white text-blue-600 shadow-xs font-black" 
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tf}m
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg text-xs font-bold opacity-60">
              <button className="px-2.5 py-1 rounded-md bg-white text-slate-700 font-extrabold cursor-not-allowed">
                Daily (1D)
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Chart Container */}
      <div className="relative flex-1 w-full h-full min-h-[350px]">
        <div ref={chartContainerRef} className="absolute inset-0 w-full h-full" />
      </div>
    </div>
  );
}