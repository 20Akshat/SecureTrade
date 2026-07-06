"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useMarket } from "@/context/MarketContext";
import OptionsChain from "@/components/OptionsChain";
import PositionsPanel from "@/components/PositionsPanel";
import BotNotificationPopup from "@/components/BotNotificationPopup";
import TradingChart from "@/components/TradingChart";
import OnboardingTour from "@/components/OnboardingTour";
import AdminPanel from "@/components/AdminPanel";
import { TrendingUp, Award, User, Bell, Activity, Target, Zap, Gauge } from "lucide-react";

// Triggering Vercel deployment with connected repository
export default function DashboardPage() {
  const { token, balance, theme, toggleTheme } = useAuth();
  const router = useRouter();
  const { marketData, selectedSymbol, setSelectedSymbol, isAutoTradeActive, toggleAutoTrade, isZeroHeroActive, toggleZeroHero, botStatus, isMarketOpen, strategyMode, setStrategyMode, targetMode, setTargetMode, requestNotificationPermission, triggerTestNotification } = useMarket();
  const [chartSymbol, setChartSymbol] = useState<string | null>(null);
  const [referralData, setReferralData] = useState<{ referralCode: string; daysEarned: number; referredCount: number; unpaidInvoice: number; dailyProfit: number; referredBy: string | null } | null>(null);
  const [paymentUtr, setPaymentUtr] = useState("");
  const [paymentPending, setPaymentPending] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeUtr, setRechargeUtr] = useState("");
  const [rechargePending, setRechargePending] = useState(false);
  const [payMode, setPayMode] = useState<"commission" | "monthly">("commission");
  const [inputReferral, setInputReferral] = useState("");

  const [documentsVerified, setDocumentsVerified] = useState(false);
  const [checkingVerified, setCheckingVerified] = useState(true);
  const [verifyAadhaarNo, setVerifyAadhaarNo] = useState("");
  const [verifyPanNo, setVerifyPanNo] = useState("");
  const [verifyPhone, setVerifyPhone] = useState("");
  const [verifyBrokerId, setVerifyBrokerId] = useState("");
  const [verifyMethod, setVerifyMethod] = useState<"pan" | "broker">("pan");
  const [verifyEmailOtp, setVerifyEmailOtp] = useState("");
  const [verifyMobileOtp, setVerifyMobileOtp] = useState("");
  const [verifyOtpRequested, setVerifyOtpRequested] = useState(false);
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);
  const [verifyError, setVerifyError] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [showGlitchNotice, setShowGlitchNotice] = useState(false);


  useEffect(() => {
    if (token) {
      fetch("https://securetrade-n3qh.onrender.com/api/referrals", {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (!data.error) setReferralData(data);
      })
      .catch(() => {});
    }
  }, [token]);

  const getUserEmail = (t: string | null) => {
    if (!t) return "";
    try {
      const payload = t.split(".")[1];
      const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
      return decoded.email || "";
    } catch {
      return "";
    }
  };

  const userEmail = getUserEmail(token);
  const isAdmin = userEmail && userEmail.toLowerCase() === "akshatmarwadi5@gmail.com";

  // Redirect to home page if user is not logged in
  useEffect(() => {
    if (!token) {
      router.push("/");
      return;
    }

    fetch("https://securetrade-n3qh.onrender.com/api/balance", {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      setDocumentsVerified(data.documents_verified !== false);
      setShowGlitchNotice(!!data.glitchNotice);
      setCheckingVerified(false);
    })
    .catch(() => {
      setCheckingVerified(false);
    });
  }, [token, router]);

  const activeIndexName = chartSymbol 
    ? (chartSymbol.includes("SENSEX") ? "SENSEX" : chartSymbol.includes("BANKNIFTY") ? "BANKNIFTY" : "NIFTY50")
    : "NIFTY50";

  const indexData = marketData[activeIndexName];
  const spotPrice = indexData?.price ? parseFloat(indexData.price as any) : 0;
  const currentRsi = indexData ? parseFloat(indexData.rsi as any) : 50;
  const currentSignal = indexData?.signal || "WAIT";

  const getBreakoutStats = () => {
    if (!spotPrice) return { level: 0, probability: 0, target: 0, status: "Scanning parameters..." };
    
    const isNifty = activeIndexName === "NIFTY50";
    const isSensex = activeIndexName === "SENSEX";
    const step = isNifty ? 500 : 1000;
    
    const nextPsychologicalLevel = Math.ceil(spotPrice / step) * step;
    const distance = nextPsychologicalLevel - spotPrice;
    
    const iv = isNifty ? 0.13 : isSensex ? 0.13 : 0.16;
    const dte = 1; 
    
    // Calculate standard deviation of 1-day move
    const stdDev = spotPrice * iv * Math.sqrt(dte / 365);
    
    // Breakout target rise
    const targetRise = isNifty ? 150 : isSensex ? 450 : 300;
    const targetValue = nextPsychologicalLevel + targetRise;
    
    // Distance to the actual breakout target (psychological level + breakout target rise)
    const totalDistance = targetValue - spotPrice;
    
    // Number of standard deviations to target
    const z = totalDistance / stdDev;
    
    // Use logistic approximation of cumulative normal distribution for touching the breakout target:
    // P_touch = 2 / (1 + exp(1.654 * z))
    const touchProb = 200 / (1 + Math.exp(1.654 * z));
    
    const rsiWeight = (currentRsi - 50) * 0.4;
    let probability = Math.max(5, Math.min(95, Math.round(touchProb + rsiWeight)));
    
    let status = "Sideways range bound";
    if (probability > 70) status = "Strong bullish breakout chances are high.";
    else if (probability > 50) status = "Moderate consolidation trend bias.";
    else if (probability > 30) status = "Resistance zone pullback likely.";
    else status = "Bearish rejection and support tests expected.";
    
    return {
      level: nextPsychologicalLevel,
      probability,
      target: targetValue,
      status
    };
  };

  const breakout = getBreakoutStats();

  if (!token) return (
    <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center text-slate-500 font-extrabold text-sm uppercase">
      <p>Please login first.</p>
    </div>
  );

  const handleSendVerifyOtps = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError("");

    // Decode JWT to extract email (fallback to empty if decoding fails)
    let email = "";
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      email = payload.email || "";
    } catch (e) {
      console.warn("Failed to decode token for email");
    }

    setVerifyLoading(true);
    try {
      const res = await fetch("https://securetrade-n3qh.onrender.com/api/user/request-otp", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to trigger OTP.");
      }
      setVerifyOtpRequested(true);
      if (data.simulated) {
        setVerifyEmailOtp(data.emailOtp || "123456");
        alert(`Demo Mode: Simulated OTP code generated!\nEmail OTP: ${data.emailOtp || "123456"}\n(Auto-filled for convenience!)`);
      } else {
        alert("Verification OTP code sent successfully to your Email!");
      }
    } catch (err: any) {
      setVerifyError(err.message);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleVerifyExistingUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError("");
    setVerifyLoading(true);

    if (!panFile || !aadhaarFile) {
      setVerifyError("Both Aadhaar Card screenshot and secondary document screenshots are required!");
      setVerifyLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("panNumber", verifyMethod === "pan" ? verifyPanNo : "");
      formData.append("brokerClientId", verifyMethod === "broker" ? verifyBrokerId : "");
      formData.append("aadhaarNumber", verifyAadhaarNo);
      formData.append("emailOtp", verifyEmailOtp);
      formData.append("panFile", panFile);
      formData.append("aadhaarFile", aadhaarFile);

      const res = await fetch("https://securetrade-n3qh.onrender.com/api/user/verify-documents", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }
      setDocumentsVerified(true);
      alert("Verification successful! Dashboard unlocked.");
    } catch (err: any) {
      setVerifyError(err.message);
    } finally {
      setVerifyLoading(false);
    }
  };

  if (checkingVerified) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-slate-300 font-extrabold text-xs tracking-widest uppercase">
        <span className="w-8 h-8 border-4 border-slate-800 border-t-blue-500 rounded-full animate-spin mb-4"></span>
        <p>Verifying terminal security...</p>
      </div>
    );
  }


  if (!documentsVerified && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-xl font-black text-white tracking-tight">Identity Verification Required 🛡️</h1>
            <p className="text-slate-400 text-xs mt-2">
              Bhai, aapke account ki security verify karne ke liye dono government IDs aur unke screenshots upload karna mandatory hai.
            </p>
          </div>

          <form onSubmit={verifyOtpRequested ? handleVerifyExistingUser : handleSendVerifyOtps} className="space-y-4">
            {verifyError && (
              <div className="p-4 bg-red-950/50 border border-red-900 text-red-400 text-xs font-bold rounded-xl text-center">
                ⚠️ {verifyError}
              </div>
            )}

            {!verifyOtpRequested ? (
              <button
                type="submit"
                disabled={verifyLoading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl transition-all shadow-md active:scale-98 text-xs tracking-wider uppercase disabled:opacity-50"
              >
                {verifyLoading ? "Requesting OTP..." : "Request Verification Email OTP"}
              </button>
            ) : (
              <>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
                  <label className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider">Verify Secondary Identity Using:</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-350 cursor-pointer">
                      <input
                        type="radio"
                        name="verifyMethodExisting"
                        checked={verifyMethod === "pan"}
                        onChange={() => setVerifyMethod("pan")}
                        className="accent-blue-600 w-4 h-4"
                      />
                      PAN Card
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-350 cursor-pointer">
                      <input
                        type="radio"
                        name="verifyMethodExisting"
                        checked={verifyMethod === "broker"}
                        onChange={() => setVerifyMethod("broker")}
                        className="accent-blue-600 w-4 h-4"
                      />
                      Broker Client ID
                    </label>
                  </div>
                </div>

                {verifyMethod === "broker" && (
                  <div>
                    <label className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1.5 ml-1">Broker Client ID / Code</label>
                    <input
                      type="text"
                      required
                      value={verifyBrokerId}
                      onChange={(e) => setVerifyBrokerId(e.target.value.toUpperCase())}
                      className="block w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. AAAE601993"
                    />
                  </div>
                )}

                {verifyMethod === "pan" && (
                  <div>
                    <label className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1.5 ml-1">PAN Card Number</label>
                    <input
                      type="text"
                      required
                      pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                      maxLength={10}
                      value={verifyPanNo}
                      onChange={(e) => setVerifyPanNo(e.target.value.toUpperCase())}
                      className="block w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="ABCDE1234F"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1.5 ml-1">Aadhaar Card Number (12-Digit)</label>
                  <input
                    type="text"
                    required
                    pattern="[0-9]{12}"
                    maxLength={12}
                    value={verifyAadhaarNo}
                    onChange={(e) => setVerifyAadhaarNo(e.target.value.replace(/[^0-9]/g, ''))}
                    className="block w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123456789012"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1.5 ml-1">Email Verification OTP (6-Digit)</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={verifyEmailOtp}
                    onChange={(e) => setVerifyEmailOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    className="block w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123456"
                  />
                </div>


                <div>
                  <label className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1.5 ml-1">
                    {verifyMethod === "pan" ? "PAN Card Screenshot" : "Broker Profile Screenshot"}
                  </label>
                  <input
                    type="file"
                    required
                    accept="image/*"
                    onChange={(e) => setPanFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-450 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1.5 ml-1">Aadhaar Card Screenshot</label>
                  <input
                    type="file"
                    required
                    accept="image/*"
                    onChange={(e) => setAadhaarFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-455 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                  />
                </div>

                <button
                  type="submit"
                  disabled={verifyLoading}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl transition-all shadow-md active:scale-98 text-xs tracking-wider uppercase disabled:opacity-50"
                >
                  {verifyLoading ? "Scanning with Vision AI..." : "Verify & Unlock Terminal"}
                </button>
              </>
            )}
          </form>
          
          <div className="mt-6 p-4 bg-slate-950 border border-slate-800 rounded-2xl text-[10px] font-mono text-slate-400 space-y-1 text-center">
            <div className="text-slate-500 font-bold uppercase tracking-wider mb-1">🔐 Terminal Diagnostic Info</div>
            <div>Session Email: <span className="text-white">{userEmail || "Not detected"}</span></div>
            <div>Admin Privileges: <span className={isAdmin ? "text-green-400 font-bold" : "text-red-400"}>{isAdmin ? "TRUE" : "FALSE"}</span></div>
            <div>Verified State: <span className={documentsVerified ? "text-green-400 font-bold" : "text-red-400"}>{documentsVerified ? "TRUE" : "FALSE"}</span></div>
          </div>
        </div>
      </div>
    );
  }

  const SYMBOLS = ["NIFTY50", "SENSEX", "BANKNIFTY"];

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-slate-800">
      <BotNotificationPopup />
      <OnboardingTour />

      {/* ── UNPAID COMMISSION INVOICE LOCK MODAL ── */}
      {referralData && referralData.unpaidInvoice > 0 && isAutoTradeActive && !isAdmin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[999] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6 animate-zoom-in">
            <div className="w-16 h-16 bg-red-50 text-red-650 rounded-full flex items-center justify-center mx-auto text-3xl font-black">
              🔒
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Bot Locked (Pending Commission)</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Unpaid Invoice: ₹{referralData.unpaidInvoice.toLocaleString("en-IN")}
              </p>
            </div>
            
            {/* Pay Mode Selector Tabs */}
            <div className="flex border-b border-slate-150">
              <button 
                onClick={() => setPayMode("commission")}
                className={`flex-1 pb-3 text-xs font-bold transition-all border-b-2 ${
                  payMode === "commission" 
                    ? "border-blue-600 text-blue-650 font-extrabold" 
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                10% Commission (₹{referralData.unpaidInvoice})
              </button>
              <button 
                onClick={() => setPayMode("monthly")}
                className={`flex-1 pb-3 text-xs font-bold transition-all border-b-2 ${
                  payMode === "monthly" 
                    ? "border-blue-600 text-blue-650 font-extrabold" 
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Flat Monthly (₹999/mo)
              </button>
            </div>

            {payMode === "commission" ? (
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Bhai, aapka daily profit **₹2,000 threshold** cross kar gaya hai! SecureTrade profit-sharing model ke according 10% flat commission charge lag gaya hai. 
                Aage ki signals aur trading unlock karne ke liye ye invoice clear/pay karein.
              </p>
            ) : (
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Bhai, commission system ko bypass karke hamesha ke liye free automated bot signals unlock karne ke liye **Flat ₹999 per Month** ka Monthly Premium plan lein!
              </p>
            )}

            {payMode === "commission" ? (
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 text-left space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-400">Total Profit Earned:</span>
                  <span className="text-slate-800 font-bold">₹{((referralData.unpaidInvoice / 10) * 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-semibold border-t border-slate-200/50 pt-2">
                  <span className="text-slate-400">Flat Commission (10%):</span>
                  <span className="text-green-600 font-black font-mono text-sm">₹{referralData.unpaidInvoice.toLocaleString("en-IN")}</span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 text-left space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-400">Premium Plan Type:</span>
                  <span className="text-slate-800 font-bold">Flat 30 Days Unlimited Bot</span>
                </div>
                <div className="flex justify-between items-center text-xs font-semibold border-t border-slate-200/50 pt-2">
                  <span className="text-slate-400">Monthly Plan Cost:</span>
                  <span className="text-green-600 font-black font-mono text-sm">₹999.00</span>
                </div>
              </div>
            )}

            {paymentPending ? (
              <div className="space-y-4 py-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-650 rounded-full flex items-center justify-center mx-auto animate-bounce text-2xl font-bold">
                  ⌛
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Payment Under Verification</h3>
                <p className="text-xs text-slate-500 leading-relaxed text-center">
                  Bhai, aapka UTR number (**{paymentUtr}**) submit ho gaya hai. 
                  Bank check karke 5-10 mins me automatically ya admin panel se approve hone par bot unlock ho jayega!
                </p>
              </div>
            ) : (
              <>
                <div className="bg-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center border border-slate-200">
                  <div className="relative w-40 h-40 bg-white border border-slate-150 rounded-2xl flex items-center justify-center p-2.5 shadow-xs">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`upi://pay?pa=akshatmarwadi5@okaxis&pn=Akshat%20Marwadi&am=${payMode === "commission" ? referralData.unpaidInvoice : 999}&cu=INR`)}`} 
                      alt="UPI QR Code" 
                      className="w-full h-full object-contain rounded-xl"
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-2">
                    Scan to Pay ₹{payMode === "commission" ? referralData.unpaidInvoice : 999} with UPI
                  </span>
                  <span className="text-xs font-black text-blue-750 mt-0.5 select-all cursor-pointer font-mono">
                    akshatmarwadi5@okaxis
                  </span>
                </div>

                <div className="space-y-2 text-left">
                  <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider ml-1">
                    Enter 12-Digit UPI Ref / UTR No.
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    value={paymentUtr}
                    onChange={(e) => setPaymentUtr(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="e.g. 618392019482"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono"
                  />
                </div>

                <button
                  disabled={paymentUtr.length !== 12}
                  onClick={async () => {
                    try {
                      const res = await fetch("https://securetrade-n3qh.onrender.com/api/pay-request", {
                        method: "POST",
                        headers: { 
                          "Content-Type": "application/json",
                          "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({
                          amount: payMode === "commission" ? referralData.unpaidInvoice : 999,
                          utr: paymentUtr,
                          type: payMode === "commission" ? "commission" : "monthly"
                        })
                      });
                      const data = await res.json();
                      if (res.ok) {
                        setPaymentPending(true);
                      } else {
                        alert(data.error || "Failed to submit payment details.");
                      }
                    } catch (err) {
                      alert("Error submitting payment details. Try again.");
                    }
                  }}
                  className={`w-full text-white rounded-xl py-3 text-xs font-black shadow-md transition-all cursor-pointer ${
                    paymentUtr.length === 12 
                      ? "bg-blue-600 hover:bg-blue-500" 
                      : "bg-slate-300 cursor-not-allowed"
                  }`}
                >
                  🚀 Submit Reference (Clear ₹{payMode === "commission" ? referralData.unpaidInvoice : 999})
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── BALANCE RECHARGE MODAL ── */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[999] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6 animate-zoom-in relative">
            <button 
              onClick={() => setShowRechargeModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 font-bold transition-all text-xs cursor-pointer p-1"
            >
              ✕ Close
            </button>
            
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto text-3xl font-black">
              ⚡
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Recharge Balance (₹200)</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Restore Account Limit to ₹1,00,000
              </p>
            </div>
            
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Bhai, aapka trading balance khtm ho gaya hai. Paper trading limit ko **₹1,00,000** par recharge karne ke liye **₹200 nominal charge** pay karein.
            </p>

            {rechargePending ? (
              <div className="space-y-4 py-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-650 rounded-full flex items-center justify-center mx-auto animate-bounce text-2xl font-bold">
                  ⌛
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Recharge Under Verification</h3>
                <p className="text-xs text-slate-500 leading-relaxed text-center">
                  Aapka recharge UTR Ref (**{rechargeUtr}**) verification ke liye bhej diya gaya hai. 
                  Admin verify karke bank balance credit hote hi user balance restore kar dega!
                </p>
              </div>
            ) : (
              <>
                <div className="bg-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center border border-slate-200">
                  <div className="w-28 h-28 bg-white rounded-lg flex items-center justify-center border border-slate-200 p-1.5 shadow-xs">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`upi://pay?pa=akshatmarwadi5@okaxis&pn=Akshat%20Marwadi&am=200&cu=INR`)}`} 
                      alt="UPI QR Code" 
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-2">
                    Scan to Pay ₹200 with UPI
                  </span>
                  <span className="text-xs font-black text-blue-750 mt-0.5 select-all cursor-pointer font-mono">
                    akshatmarwadi5@okaxis
                  </span>
                </div>

                <div className="space-y-2 text-left">
                  <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider ml-1">
                    Enter 12-Digit UPI Ref / UTR No.
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    value={rechargeUtr}
                    onChange={(e) => setRechargeUtr(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="e.g. 618392019482"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono"
                  />
                </div>

                <button
                  disabled={rechargeUtr.length !== 12}
                  onClick={async () => {
                    try {
                      const res = await fetch("https://securetrade-n3qh.onrender.com/api/pay-request", {
                        method: "POST",
                        headers: { 
                          "Content-Type": "application/json",
                          "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({
                          amount: 200,
                          utr: rechargeUtr,
                          type: "recharge"
                        })
                      });
                      const data = await res.json();
                      if (res.ok) {
                        setRechargePending(true);
                      } else {
                        alert(data.error || "Failed to submit recharge details.");
                      }
                    } catch (err) {
                      alert("Error submitting recharge details. Try again.");
                    }
                  }}
                  className={`w-full text-white rounded-xl py-3 text-xs font-black shadow-md transition-all cursor-pointer ${
                    rechargeUtr.length === 12 
                      ? "bg-blue-600 hover:bg-blue-500" 
                      : "bg-slate-300 cursor-not-allowed"
                  }`}
                >
                  🚀 Submit Recharge Reference
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── TOP HEADER / NAVBAR (SecureTrade Design) ── */}
      <div className="bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-850 px-4 py-3 flex items-center justify-between gap-4 flex-wrap sticky top-0 z-30 shadow-xs transition-colors">
        
        {/* App Logo */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center font-black text-base text-white shadow-md shadow-blue-105">ST</div>
          <span className="font-extrabold text-slate-800 dark:text-zinc-100 text-lg hidden sm:block">
            Secure<span className="text-blue-600 font-black">Trade</span>
          </span>
        </div>

        {/* Real-time Market Indices with Chart trigger buttons */}
        <div className="flex items-center gap-4 flex-wrap">
          {SYMBOLS.map(sym => {
            const d = marketData[sym];
            if (!d) return null;
            
            const open = d.close || (sym === "NIFTY50" ? 24168 : sym === "SENSEX" ? 77410 : 57964);
            const change = d.price - open;
            const changePct = (change / open) * 100;
            const isUp = change >= 0;
            return (
              <div key={sym} className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-1 shadow-2xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all">
                <button 
                  onClick={() => setSelectedSymbol(sym)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs font-bold ${
                    selectedSymbol === sym 
                      ? "bg-slate-100 dark:bg-zinc-850 text-slate-900 dark:text-zinc-100" 
                      : "text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  <span>{sym.replace("NIFTY50", "NIFTY")}</span>
                  <span className="font-mono text-slate-800 dark:text-zinc-200 font-extrabold">₹{d.price.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                  <span className={`text-[10px] font-black font-mono flex items-center gap-0.5 ${isUp ? "text-green-600" : "text-red-655"}`}>
                    {isUp ? "▲" : "▼"}{Math.abs(change).toFixed(0)} ({Math.abs(changePct).toFixed(2)}%)
                  </span>
                </button>
                <button
                  onClick={() => setChartSymbol(sym)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-450 dark:text-zinc-550 hover:text-blue-600 dark:hover:text-blue-400 transition-all font-bold text-xs"
                  title={`View ${sym} Chart`}
                >
                  📈
                </button>
              </div>
            );
          })}
        </div>

        {/* User Stats + Bot Controls */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:flex items-center gap-3 text-xs font-semibold">
            <div>
              <span className="text-slate-400 uppercase tracking-wider block text-[9px] font-extrabold text-right">Trading Limit</span>
              <span className="text-green-650 font-black text-base font-mono">
                ₹{balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            {balance < 5000 && (
              <button
                onClick={() => {
                  setRechargeUtr("");
                  setRechargePending(false);
                  setShowRechargeModal(true);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase px-2.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-sm animate-pulse"
              >
                ⚡ Recharge
              </button>
            )}
          </div>
          
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-extrabold border bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-655 dark:text-zinc-350 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all shadow-sm cursor-pointer"
            title="Toggle theme (Light / Dark)"
          >
            {theme === "light" ? "🌙 Dark" : "☀️ Light"}
          </button>

          <button 
            id="bot-advisor-switch"
            onClick={toggleAutoTrade}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-extrabold border transition-all shadow-sm ${
              isAutoTradeActive 
                ? "bg-green-50 border-green-300 text-green-700 font-extrabold" 
                : "bg-white border-slate-250 text-slate-500 hover:bg-slate-50"
            }`}
          >
            🤖 Bot Advisor: {isAutoTradeActive ? "ACTIVE" : "OFF"}
          </button>

          <button
            onClick={async () => {
              if (typeof window !== "undefined") {
                if (!("Notification" in window)) {
                  alert("Browser notifications are not supported on this browser/device. Try using Chrome or Edge on desktop.");
                  return;
                }
                try {
                  console.log("Current notification permission state:", Notification.permission);
                  if (Notification.permission !== "granted") {
                    const result = await requestNotificationPermission();
                    if (!result) {
                      alert("Notification permission request was denied or closed. Please click the Lock (🔒) icon in your browser URL bar and set Notifications to 'Allow'.");
                    }
                  } else {
                    triggerTestNotification();
                  }
                } catch (err: any) {
                  alert("Error requesting notification: " + err.message);
                }
              }
            }}
            title="Test Browser Notification Alert"
            className="flex items-center justify-center p-2.5 rounded-xl border border-slate-250 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all shadow-sm cursor-pointer"
          >
            <Bell size={16} />
          </button>

          {isAutoTradeActive && (
            <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-0.5 shadow-inner text-[10px] gap-0.5" title="Bot Strategy Selection">
              <button
                type="button"
                onClick={() => setStrategyMode("auto")}
                className={`px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer ${
                  strategyMode === "auto"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                🤖 AI AUTO
              </button>
              <button
                type="button"
                onClick={() => setStrategyMode("crossover")}
                className={`px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer ${
                  strategyMode === "crossover"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                📈 EMA CROSS
              </button>
              <button
                type="button"
                onClick={() => setStrategyMode("5ema")}
                className={`px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer ${
                  strategyMode === "5ema"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                🕯️ 5EMA
              </button>
              <button
                type="button"
                onClick={() => setStrategyMode("gainz")}
                className={`px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer ${
                  strategyMode === "gainz"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                🚀 GAINZ ALGO
              </button>
            </div>
          )}

          {isAutoTradeActive && (
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-0.5 shadow-inner text-[10px] gap-0.5" title="Target/SL Exit Mode">
              <button
                type="button"
                onClick={() => setTargetMode("probability")}
                className={`px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer ${
                  targetMode === "probability"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                🎯 PROBABILITY (ATR)
              </button>
              <button
                type="button"
                onClick={() => setTargetMode("money")}
                className={`px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer ${
                  targetMode === "money"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                💵 FIXED MONEY
              </button>
            </div>
          )}

          {isAutoTradeActive && (
            <button 
              onClick={toggleZeroHero}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-extrabold border transition-all shadow-sm cursor-pointer ${
                isZeroHeroActive 
                  ? "bg-yellow-50 border-yellow-300 text-yellow-700 font-extrabold shadow-[0_0_12px_rgba(234,179,8,0.3)]" 
                  : "bg-white border-slate-250 text-slate-500 hover:bg-slate-50"
              }`}
            >
              ⚡ Zero-Hero: {isZeroHeroActive ? "ACTIVE" : "OFF"}
            </button>
          )}
        </div>

      </div>

      {/* ── SERVER GLITCH WARNING BANNER ── */}
      {showGlitchNotice && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-base shrink-0">⚠️</span>
            <p className="text-xs text-amber-800 font-extrabold uppercase tracking-wide leading-relaxed">
              System Notice: Due to a server cache glitch, a wrong trade/PnL was shown on your dashboard earlier today. Your portfolio trades have been cleared, and your starting balance has been restored to ₹1,00,000.00 for a fresh start. We sincerely apologize for the inconvenience!
            </p>
          </div>
          <button
            onClick={async () => {
              setShowGlitchNotice(false);
              try {
                await fetch("https://securetrade-n3qh.onrender.com/api/dismiss-glitch-notice", {
                  method: "POST",
                  headers: { Authorization: `Bearer ${token}` }
                });
              } catch (e) {}
            }}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs border-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── MARKET CLOSED NOTIFICATION BANNER ── */}
      {!isMarketOpen && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-ping shrink-0" />
          <p className="text-xs text-red-700 font-extrabold uppercase tracking-wider text-center leading-relaxed">
            Market is Closed (Closed: Mon-Fri after 3:30 PM & Weekends). Running in practice sandbox mode with simulated live rates.
          </p>
        </div>
      )}

      {/* ── BOT SYSTEM STATUS BAR ── */}
      {isAutoTradeActive && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-2 flex items-center justify-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
          <p className="text-xs text-green-700 font-extrabold tracking-wide font-mono text-center">
            {botStatus.replace("🟢", "").replace("⭕", "").replace("🔔", "")}
          </p>
        </div>
      )}

      {/* ── MAIN DASHBOARD VIEW ── */}
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">

        {/* Referral Program Widget */}
        {referralData && (
          <div className="bg-slate-950 rounded-3xl p-5 text-white flex items-center justify-between gap-4 shadow-lg flex-wrap border border-slate-900">
            <div className="space-y-1">
              <span className="bg-white/20 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                🎁 VIRAL REFERRAL PROGRAM
              </span>
              <h3 className="font-extrabold text-base tracking-tight mt-1">Refer a Friend & Get 3 Days Free Bot Service!</h3>
              <p className="text-xs text-white/80 max-w-xl font-medium leading-relaxed">
                Bhai, apne friends ko apna custom code share karo. Jaise hi vo signup karenge, **unhe bhi 3 days** free bot service milegi aur **aapko bhi 3 days** free service add ho jayegi!
              </p>
            </div>
            <div className="flex items-center gap-4 flex-wrap bg-white/10 p-3 rounded-2xl border border-white/10 backdrop-blur-xs">
              {!referralData.referredBy ? (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Referrer Code"
                      value={inputReferral}
                      onChange={(e) => setInputReferral(e.target.value.toUpperCase())}
                      className="bg-white/15 border border-white/25 text-white placeholder-white/40 text-xs px-2.5 py-1.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-white/40 w-28 font-bold"
                    />
                    <button
                      onClick={async () => {
                        if (!inputReferral) return;
                        try {
                          const res = await fetch("https://securetrade-n3qh.onrender.com/api/referrals/apply", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              "Authorization": `Bearer ${token}`
                            },
                            body: JSON.stringify({ referralCode: inputReferral })
                          });
                          const data = await res.json();
                          if (res.ok) {
                            alert(data.message || "Referral code applied successfully! 🎉");
                            const refRes = await fetch("https://securetrade-n3qh.onrender.com/api/referrals", {
                              headers: { "Authorization": `Bearer ${token}` }
                            });
                            const refData = await refRes.json();
                            if (refRes.ok) setReferralData(refData);
                            setInputReferral("");
                          } else {
                            alert(data.error || "Failed to apply referral code.");
                          }
                        } catch (err) {
                          alert("Error applying referral code.");
                        }
                      }}
                      className="bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                  <div className="h-8 w-px bg-white/20" />
                </>
              ) : (
                <>
                  <div className="text-center px-1">
                    <span className="text-[9px] text-white/70 block uppercase font-bold">Referred By</span>
                    <span className="text-xs font-bold text-green-400 block mt-0.5 truncate max-w-[120px]" title={referralData.referredBy}>
                      {referralData.referredBy.split('@')[0]}
                    </span>
                  </div>
                  <div className="h-8 w-px bg-white/20" />
                </>
              )}
              <div className="text-center px-1">
                <span className="text-[10px] text-white/70 block uppercase font-bold">Your Code</span>
                <span className="text-sm font-black tracking-wider select-all cursor-pointer bg-white text-blue-700 px-2 py-0.5 rounded-md mt-0.5 inline-block">
                  {referralData.referralCode}
                </span>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="text-center">
                <span className="text-[10px] text-white/70 block uppercase font-bold">Refers</span>
                <span className="text-base font-black font-mono">{referralData.referredCount}</span>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="text-center">
                <span className="text-[10px] text-white/70 block uppercase font-bold">Days Earned</span>
                <span className="text-base font-black font-mono">+{referralData.daysEarned}d</span>
              </div>
            </div>
          </div>
        )}

        {/* Options Chain table section */}
        <OptionsChain onShowChart={(symbol) => setChartSymbol(symbol)} />

        {/* Holdings/Positions display */}
        <PositionsPanel onShowChart={(symbol) => setChartSymbol(symbol)} />

        {/* Admin Control Panel */}
        {isAdmin && token && <AdminPanel token={token} />}

      </div>

      {/* ── CHART MODAL (Light Theme SecureTrade style) ── */}
      {chartSymbol && (
        <>
          {/* Blur backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/35 backdrop-blur-xs z-45"
            onClick={() => setChartSymbol(null)}
          />
          
          <div className="fixed inset-x-4 top-10 bottom-10 md:inset-10 lg:inset-[10%] bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 z-50 flex flex-col max-w-[80vw] mx-auto animate-zoom-in">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-150">
              <div>
                <h3 className="text-slate-800 font-black text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600 animate-pulse" />
                  {chartSymbol.includes("CE") || chartSymbol.includes("PE") ? "Option Contract Chart" : "Index Live Graph"}
                </h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  {chartSymbol.replace("NIFTY50", "NIFTY")}
                </p>
              </div>
              
              <button 
                onClick={() => setChartSymbol(null)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center transition-all font-black text-sm"
              >
                ✕
              </button>
            </div>
            
            {/* Live Chart + Indicators Layout */}
            <div className="flex-1 mt-4 flex flex-col lg:flex-row gap-5 min-h-0 overflow-hidden">
              
              {/* Left Column: Live Chart */}
              <div className="flex-1 border border-slate-200 rounded-2xl overflow-hidden p-2 bg-white relative min-h-[300px]">
                <TradingChart customSymbol={chartSymbol} />
              </div>
              
              {/* Right Column: Pro Analytics Panel */}
              <div className="w-full lg:w-80 border border-slate-200 bg-slate-50/50 rounded-2xl p-4 flex flex-col justify-between overflow-y-auto space-y-4">
                <div>
                  {/* Panel Header */}
                  <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-slate-200/60">
                    <span className="text-slate-800 font-extrabold text-xs flex items-center gap-1.5">
                      <Gauge className="w-4.5 h-4.5 text-blue-600" />
                      Pro Analysis Sentiment
                    </span>
                    <span className="bg-blue-100 text-blue-700 text-[9px] font-black uppercase px-2 py-0.5 rounded">PRO</span>
                  </div>

                  {/* Psychological level prediction */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-3xs space-y-3">
                    <div className="flex items-center gap-1.5">
                      <Target className="w-4.5 h-4.5 text-blue-600" />
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Breakout Target Level</span>
                    </div>
                    
                    <div>
                      <h4 className="text-slate-800 font-black text-lg font-mono leading-none mb-1">
                        ₹{breakout.level.toLocaleString("en-IN")}
                      </h4>
                      <p className="text-[10px] text-slate-450 font-bold uppercase">
                        Current Index LTP: <span className="font-mono text-slate-700">₹{spotPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                      </p>
                    </div>

                    {/* Progress Bar / Probability Gauge */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-400 uppercase">Breakout Probability</span>
                        <span className="text-blue-600 font-mono font-black">{breakout.probability}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${breakout.probability}%` }}
                        />
                      </div>
                    </div>

                    {/* Projected Target Zone */}
                    <div className="bg-blue-50/40 border border-blue-100 rounded-lg p-2.5 text-[10px] text-slate-700 font-semibold space-y-1">
                      <div className="flex justify-between">
                        <span className="text-blue-700 font-bold uppercase">Projected Target:</span>
                        <span className="font-mono font-black text-blue-800">₹{breakout.target.toLocaleString("en-IN")}</span>
                      </div>
                      <p className="text-slate-450 text-[9px] font-medium leading-normal">
                        RSI momentum suggests {breakout.probability > 50 ? "a potential upward extension if target resistance level is broken." : "strong overhead supply; breakout chances remain low unless index volume surges."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Technical Indicators summary list */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Live Technical Indicators</span>
                  <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5 text-xs font-semibold text-slate-700 shadow-3xs">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-450 uppercase">RSI (14) Index</span>
                      <span className={`font-mono font-black ${currentRsi < 35 ? "text-green-600" : currentRsi > 65 ? "text-red-655" : "text-slate-650"}`}>
                        {currentRsi.toFixed(1)} ({currentRsi < 35 ? "Oversold" : currentRsi > 65 ? "Overbought" : "Neutral"})
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-100 pt-2.5">
                      <span className="text-[10px] text-slate-450 uppercase">MA Signals</span>
                      <span className={`font-black uppercase text-[10px] ${currentSignal.includes("BUY") ? "text-green-600" : currentSignal.includes("SELL") ? "text-red-655" : "text-slate-500"}`}>
                        {currentSignal}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Verdict warning card */}
                <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-[10px] leading-normal font-semibold text-slate-600 space-y-1">
                  <span className="text-slate-800 font-extrabold uppercase flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                    Verdict Analytica:
                  </span>
                  <p className="text-slate-500 font-medium">
                    {breakout.status} Expiry day momentum creates high gamma swings. Utilize risk indicators and Stop-Loss limits dynamically.
                  </p>
                </div>

              </div>
            </div>
            
            {/* Modal footer tips */}
            <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-semibold text-center uppercase tracking-wider leading-none">
              ⚡ Chart displays real-time price changes of index or options premium.
            </div>
          </div>
        </>
      )}
    </div>
  );
}