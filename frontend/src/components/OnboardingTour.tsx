"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, AlertTriangle, ArrowRight, HelpCircle } from "lucide-react";

interface TourStep {
  title: string;
  description: string;
  targetId?: string;
  position: "top" | "bottom" | "left" | "right" | "center";
}

export default function OnboardingTour() {
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const TOUR_STEPS: TourStep[] = [
    {
      title: "Welcome to SecureTrade! 🚀",
      description: "Chalo bhai, ek quick game-style tutorial se terminal ke saare important buttons aur controls ko samajhte hain! Click next to start.",
      position: "center"
    },
    {
      title: "Options Chain & Strike Selection 📊",
      description: "Yahan se aap Nifty, BankNifty ya Sensex strike choose kar sakte hain. Buy/Sell click karne par custom parameters toggle kar sakte hain.",
      targetId: "options-chain-panel",
      position: "bottom"
    },
    {
      title: "AI Advisor Switch & Auto Settings 🤖",
      description: "Is button se hum AI signal generation aur automation strategies control karte hain. Strategies (5EMA / Crossover) yahan select hoti hain.",
      targetId: "bot-advisor-switch",
      position: "bottom"
    },
    {
      title: "Active Positions & Stop-Loss/Target limits 💼",
      description: "Yahan active paper trades, dynamic PnL, aur pending limit orders display hote hain. Har position ka target aur SL limits edit kar sakte hain.",
      targetId: "positions-panel",
      position: "top"
    },
    {
      title: "AI Chatbot & Support Desk 💬",
      description: "Is floating icon par click karke aap market updates ke liye AI bot aur terminal bugs reset ke liye Tech Support Desk se chat kar sakte hain!",
      targetId: "chatbot-floating-btn",
      position: "left"
    }
  ];

  useEffect(() => {
    if (typeof window !== "undefined") {
      const riskAccepted = localStorage.getItem("st_risk_accepted_v1") === "true";
      const tourCompleted = localStorage.getItem("st_tour_completed") === "true";

      if (!riskAccepted) {
        setShowDisclaimer(true);
      } else if (!tourCompleted) {
        setShowTour(true);
      }
    }
  }, []);

  // Real-time highlighting scanner for game-style tutorial experience
  useEffect(() => {
    if (!showTour) return;
    const step = TOUR_STEPS[currentStep];
    
    // Remove existing highlights
    TOUR_STEPS.forEach(s => {
      if (s.targetId) {
        const el = document.getElementById(s.targetId);
        if (el) {
          el.classList.remove("ring-4", "ring-blue-600", "ring-offset-4", "animate-pulse", "relative", "z-[160]", "bg-white");
        }
      }
    });

    // Apply glowing ring to the target step element
    if (step.targetId) {
      const el = document.getElementById(step.targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-4", "ring-blue-600", "ring-offset-4", "animate-pulse", "relative", "z-[160]", "bg-white");
      }
    }
    
    // Cleanup on unmount or step changes
    return () => {
      if (step.targetId) {
        const el = document.getElementById(step.targetId);
        if (el) {
          el.classList.remove("ring-4", "ring-blue-600", "ring-offset-4", "animate-pulse", "relative", "z-[160]", "bg-white");
        }
      }
    };
  }, [currentStep, showTour]);

  const handleAcceptDisclaimer = () => {
    localStorage.setItem("st_risk_accepted_v1", "true");
    setShowDisclaimer(false);
    
    const tourCompleted = localStorage.getItem("st_tour_completed") === "true";
    if (!tourCompleted) {
      setShowTour(true);
    }
  };

  const handleNextStep = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleCompleteTour();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleCompleteTour = () => {
    // Clear all glowing frames
    TOUR_STEPS.forEach(s => {
      if (s.targetId) {
        const el = document.getElementById(s.targetId);
        if (el) {
          el.classList.remove("ring-4", "ring-blue-600", "ring-offset-4", "animate-pulse", "relative", "z-[160]", "bg-white");
        }
      }
    });
    localStorage.setItem("st_tour_completed", "true");
    setShowTour(false);
    setCurrentStep(0);
  };

  const handleRestartTour = () => {
    setCurrentStep(0);
    setShowTour(true);
  };

  // Render Disclaimer Modal
  if (showDisclaimer) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-7 max-w-xl w-full shadow-2xl animate-zoom-in space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-slate-800 font-black text-xl tracking-tight">Terms of Service & Risk Disclosure</h2>
              <p className="text-slate-450 text-xs font-bold uppercase tracking-wider">Mandatory User Acceptance Policy</p>
            </div>
          </div>

          <div className="space-y-4 text-xs font-semibold text-slate-600 max-h-[300px] overflow-y-auto pr-2 leading-relaxed">
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
              <p className="font-bold">
                WARNING: Options trading involves extreme volatility and high financial risk. Up to 9 out of 10 individual traders in index options incur net losses.
              </p>
            </div>

            <p>
              By entering this terminal, you explicitly read, understand, and agree to the following terms:
            </p>
            
            <ul className="list-disc pl-5 space-y-2.5">
              <li>
                <strong className="text-slate-800">Research & Simulation Only:</strong> This platform is designed solely for paper trading, educational research, and strategy simulation. No real capital is traded or processed.
              </li>
              <li>
                <strong className="text-slate-800">Not SEBI Registered:</strong> The developer and platform administrators are NOT SEBI-registered financial advisors or research analysts. Any trade signals or chatbot suggestions do not constitute financial advice.
              </li>
              <li>
                <strong className="text-slate-800">Individual Risk:</strong> You assume 100% of the risk and liability for any financial decisions made inside or outside this simulator. We shall not be held liable for any loss of capital or data.
              </li>
              <li>
                <strong className="text-slate-800">No Bypass of Terms:</strong> Registering duplicate accounts to avoid fee schedules or violating platform security measures will result in permanent client locks based on verified document IDs.
              </li>
            </ul>
          </div>

          <div className="border-t border-slate-100 pt-5 flex justify-end">
            <button
              onClick={handleAcceptDisclaimer}
              className="py-3 px-6 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl shadow-md active:scale-98 transition-all flex items-center gap-2 text-xs tracking-wider uppercase cursor-pointer"
            >
              <span>I Agree & Accept All Risks</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Interactive Tour Overlay Dialog
  if (showTour) {
    const step = TOUR_STEPS[currentStep];

    return (
      <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 pointer-events-none">
        {/* Floating Step Card (pointer-events-auto so buttons work inside) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-zoom-in text-white space-y-4 pointer-events-auto">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <span className="bg-blue-600/30 text-blue-400 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
              Tour Step {currentStep + 1} of {TOUR_STEPS.length}
            </span>
            <button 
              onClick={handleCompleteTour}
              className="text-slate-500 hover:text-slate-300 transition-all font-bold text-xs cursor-pointer"
              title="Skip Tour"
            >
              ✕ Skip
            </button>
          </div>

          <div className="space-y-2">
            <h3 className="font-extrabold text-base leading-tight text-white">{step.title}</h3>
            <p className="text-xs text-slate-400 font-semibold leading-relaxed">{step.description}</p>
          </div>

          <div className="flex justify-between items-center pt-2.5">
            <button
              onClick={handlePrevStep}
              disabled={currentStep === 0}
              className="px-3.5 py-2 text-xs font-bold text-slate-400 hover:text-white disabled:opacity-40 transition-all cursor-pointer"
            >
              ← Back
            </button>
            <button
              onClick={handleNextStep}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl shadow-md transition-all uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <span>{currentStep === TOUR_STEPS.length - 1 ? "Finish" : "Next"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Floating Tour Restart Button on Dashboard
  return (
    <button
      onClick={handleRestartTour}
      title="Restart User Guide Tour"
      className="fixed bottom-24 right-6 z-40 bg-white border border-slate-200 hover:border-slate-350 w-11 h-11 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl text-slate-500 hover:text-blue-600 transition-all cursor-pointer"
    >
      <HelpCircle className="w-5.5 h-5.5" />
    </button>
  );
}
