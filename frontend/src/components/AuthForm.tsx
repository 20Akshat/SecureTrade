"use client";

import { useState, useEffect } from "react";
import { Mail, Lock, LogIn, UserPlus, Phone, User, ShieldAlert } from "lucide-react";

export default function AuthForm({ onLogin }: { onLogin: (token: string, balance: number) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  
  // Dynamic Broker/Identity document locks
  const [brokerClientId, setBrokerClientId] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  
  // Signup OTP Verification states
  const [emailOtp, setEmailOtp] = useState("");
  const [mobileOtp, setMobileOtp] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [panFile, setPanFile] = useState<File | null>(null);
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  
  // Forgot password flow states
  const [showForgot, setShowForgot] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const expired = localStorage.getItem("st_session_expired");
      if (expired === "true") {
        setError("Your session has expired or is invalid. Please login again.");
        localStorage.removeItem("st_session_expired");
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const url = isLogin ? "https://securetrade-n3qh.onrender.com/api/login" : "https://securetrade-n3qh.onrender.com/api/signup";
    
    try {
      let res;
      if (isLogin) {
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
      } else {
        if (!panFile || !aadhaarFile) {
          throw new Error("Both PAN Card/Broker Profile and Aadhaar Card screenshot files are required!");
        }
        const formData = new FormData();
        formData.append("email", email);
        formData.append("password", password);
        formData.append("phone", phone);
        formData.append("brokerClientId", brokerClientId);
        formData.append("panNumber", panNumber);
        formData.append("aadhaarNumber", aadhaarNumber);
        formData.append("emailOtp", emailOtp);
        formData.append("mobileOtp", mobileOtp);
        formData.append("referralCode", referralCode);
        formData.append("panFile", panFile);
        formData.append("aadhaarFile", aadhaarFile);

        res = await fetch(url, {
          method: "POST",
          body: formData,
        });
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      if (isLogin) {
        onLogin(data.token, data.balance);
      } else {
        setIsLogin(true);
        alert("Account created successfully! Please login.");
        setPassword("");
        setPhone("");
        setPanNumber("");
        setAadhaarNumber("");
        setBrokerClientId("");
        setEmailOtp("");
        setMobileOtp("");
        setOtpRequested(false);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSignupOtp = async (e: React.MouseEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email || !phone) {
      setError("Please fill in both Email and Mobile Number first to request verification OTPs.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("https://securetrade-n3qh.onrender.com/api/signup/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to trigger OTPs.");
      }
      setOtpRequested(true);
      alert("Verification OTP codes sent successfully to your Email & Mobile Number!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("https://securetrade-n3qh.onrender.com/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOtpSent(true);
      alert("Verification OTP sent! Check backend terminal or scratch/otp_debug.log.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("https://securetrade-n3qh.onrender.com/api/auth/verify-otp-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpCode, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert("Password reset successful! Please login.");
      setShowForgot(false);
      setOtpSent(false);
      setOtpCode("");
      setNewPassword("");
      setPassword("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (showForgot) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f5f7fa] p-4">
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-blue-200 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-purple-200 rounded-full blur-3xl opacity-30"></div>

        <div className="relative z-10 w-full max-w-md p-8 bg-white border border-slate-200 rounded-3xl shadow-xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Forgot Password</h1>
            <p className="text-slate-450 text-xs font-semibold mt-1">Reset your SecureTrade account password.</p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold text-center">
              {error}
            </div>
          )}

          {!otpSent ? (
            <form onSubmit={handleRequestOtp} className="space-y-5 text-xs font-semibold text-slate-600">
              <div>
                <label className="block text-slate-500 mb-1.5 ml-1">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-4.5 w-4.5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="trader@secure.com"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl shadow-md text-xs tracking-wider uppercase disabled:opacity-50"
              >
                {loading ? "Requesting..." : "Send Verification Code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyAndReset} className="space-y-5 text-xs font-semibold text-slate-600">
              <div>
                <label className="block text-slate-500 mb-1.5 ml-1">6-Digit OTP Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="block w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 tracking-widest text-center font-black focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-base"
                  placeholder="000000"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1.5 ml-1">New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-4.5 w-4.5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl shadow-md text-xs tracking-wider uppercase disabled:opacity-50"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => { setShowForgot(false); setOtpSent(false); setError(""); }}
              className="text-blue-600 hover:text-blue-500 font-bold transition-all text-xs"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f5f7fa] p-4">
      {/* Decorative Blur elements */}
      <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-blue-200 rounded-full blur-3xl opacity-30"></div>
      <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-purple-200 rounded-full blur-3xl opacity-30"></div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md p-8 bg-white border border-slate-200 rounded-3xl shadow-xl">
        <div className="text-center mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white text-base mx-auto mb-3 shadow-md shadow-blue-105">ST</div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Secure<span className="text-blue-600 font-black">Trade</span>
          </h1>
          <p className="text-slate-450 text-xs font-semibold mt-1 font-sans">
            {isLogin ? "Welcome back! Login to your trading terminal." : "Create account for AI-powered trading."}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-200/50 text-red-650 text-xs font-bold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-xs font-semibold text-slate-655">
          <div>
            <label className="block text-slate-500 mb-1.5 ml-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-4.5 w-4.5 text-slate-400" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="trader@secure.com"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-slate-500 ml-1">Password</label>
              {isLogin && (
                <button
                  type="button"
                  onClick={() => { setShowForgot(true); setError(""); }}
                  className="text-blue-600 hover:text-blue-500 font-bold transition-all text-[11px]"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-4.5 w-4.5 text-slate-400" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          {!isLogin && (
            <>
              <div>
                <label className="block text-slate-500 mb-1.5 ml-1">Mobile Number (For SMS Alerts)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="h-4.5 w-4.5 text-slate-400" />
                  </div>
                  <input
                    type="tel"
                    required
                    pattern="[0-9]{10}"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="9876543210"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1.5 ml-1">Broker Client ID / Code</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-4.5 w-4.5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={brokerClientId}
                    onChange={(e) => setBrokerClientId(e.target.value.toUpperCase())}
                    className="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="e.g. AAAE601993"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1.5 ml-1">PAN Card Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-4.5 w-4.5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                    maxLength={10}
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    className="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="ABCDE1234F"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1.5 ml-1">Aadhaar Card Number (12-Digit)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-4.5 w-4.5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    pattern="[0-9]{12}"
                    maxLength={12}
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(e.target.value.replace(/[^0-9]/g, ''))}
                    className="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="123456789012"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-505 mb-1.5 ml-1">Referral Code (Optional - Earn 3 Days Free Bot Service)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <UserPlus className="h-4.5 w-4.5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    className="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="AKSHAT123"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1.5 ml-1">PAN Card / Broker Profile Screenshot</label>
                <input
                  type="file"
                  required
                  accept="image/*"
                  onChange={(e) => setPanFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1.5 ml-1">Aadhaar Card Screenshot</label>
                <input
                  type="file"
                  required
                  accept="image/*"
                  onChange={(e) => setAadhaarFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                />
              </div>

              {otpRequested && (
                <>
                  <div>
                    <label className="block text-slate-500 mb-1.5 ml-1">Email Verification OTP (6-Digit)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-4.5 w-4.5 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value.replace(/[^0-9]/g, ''))}
                        className="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="e.g. 123456"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1.5 ml-1">Mobile Verification OTP (6-Digit)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-4.5 w-4.5 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={mobileOtp}
                        onChange={(e) => setMobileOtp(e.target.value.replace(/[^0-9]/g, ''))}
                        className="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="e.g. 654321"
                      />
                    </div>
                  </div>

                  <div className="text-right">
                    <button
                      type="button"
                      onClick={handleRequestSignupOtp}
                      className="text-xs text-blue-600 hover:text-blue-500 font-bold"
                    >
                      Resend OTP Codes
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {isLogin || otpRequested ? (
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl shadow-md shadow-blue-105 active:scale-98 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 text-xs tracking-wider uppercase cursor-pointer"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : isLogin ? (
                <>
                  <LogIn className="w-4.5 h-4.5" />
                  <span>Enter Terminal</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4.5 h-4.5" />
                  <span>Verify & Create Account</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRequestSignupOtp}
              disabled={loading}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl shadow-md shadow-blue-105 active:scale-98 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 text-xs tracking-wider uppercase cursor-pointer"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <UserPlus className="w-4.5 h-4.5" />
                  <span>Request Verification OTPs</span>
                </>
              )}
            </button>
          )}
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs font-semibold text-slate-400">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="text-blue-600 hover:text-blue-500 font-bold transition-all"
            >
              {isLogin ? "Sign up now" : "Login instead"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}