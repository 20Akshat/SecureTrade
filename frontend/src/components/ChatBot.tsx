"use client";
import { useState, useRef, useEffect } from "react";
import { useMarket } from "@/context/MarketContext";
import { useAuth } from "@/context/AuthContext";
import { MessageCircle, Send, X, Bot, Sparkles, Trash2 } from "lucide-react";

interface Message {
  sender: "user" | "bot";
  text: string;
  timestamp: Date;
}

export default function ChatBot() {
  const { marketData, selectedSymbol } = useMarket();
  const { balance, token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [positions, setPositions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"advisor" | "support">("advisor");
  const [supportMessages, setSupportMessages] = useState<Message[]>([]);

  useEffect(() => {
    setSupportMessages([
      {
        sender: "bot",
        text: "Bhai! SecureTrade Tech Support Desk me aapka swagat hai. Main platform developer AI hu. Yahan aap terminal errors, simulated balance resets, weekly maintenance schedule, aadhar/pan verification docs, ya system connectivity bugs ke baare me directly help le sakte hain! 🔧🤖",
        timestamp: new Date()
      }
    ]);
  }, []);

  useEffect(() => {
    if (!token || !isOpen) return;

    const fetchPositions = async () => {
      try {
        const res = await fetch("https://securetrade-n3qh.onrender.com/api/portfolio", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setPositions(data);
        }
      } catch {}
    };

    fetchPositions();
    const interval = setInterval(fetchPositions, 3000);
    return () => clearInterval(interval);
  }, [token, isOpen]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("securetrade_chat_history");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const formatted = parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
        setMessages(formatted);
      } catch {
        setInitialMessage();
      }
    } else {
      setInitialMessage();
    }
    setIsLoaded(true);
  }, []);

  const setInitialMessage = () => {
    setMessages([
      {
        sender: "bot",
        text: "Bhai! Aapka swagat hai. Main SecureTrade AI Bot hu. Live trends, tomorrow's forecast, hold/sell advice, ya support-resistance levels ke baare me kuch bhi puchho! 📈🤖",
        timestamp: new Date(),
      }
    ]);
  };

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("securetrade_chat_history", JSON.stringify(messages));
    }
  }, [messages, isLoaded]);

  const clearHistory = () => {
    if (confirm("Kya aap chat history delete karna chahte hain?")) {
      localStorage.removeItem("securetrade_chat_history");
      setInitialMessage();
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    // Add user message
    const userMsg: Message = { sender: "user", text: query, timestamp: new Date() };
    
    if (activeTab === "support") {
      setSupportMessages((prev) => [...prev, userMsg]);
      setInput("");
      
      const isCallReq = query.toLowerCase().includes("call") || 
                        query.toLowerCase().includes("contact") || 
                        query.toLowerCase().includes("phone") || 
                        query.toLowerCase().includes("admin");

      setTimeout(async () => {
        let responseText = generateSupportResponse(query);
        
        if (isCallReq && token) {
          try {
            const res = await fetch("https://securetrade-n3qh.onrender.com/api/support-request", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ message: query })
            });
            if (res.ok) {
              responseText = "📨 **Support Request Submitted!**\n\nBhai, aapki details aur query database mein safely register ho gayi hai. Admin Akshat ke paas request chali gayi hai aur vo apne free time (Saturday/Sunday) par aapse contact karenge!\n\nTab tak agar koi standard system issue ho, toh aap mujhse (Support Desk Bot) yahan pooch sakte hain, main instant solve kar dunga!";
            }
          } catch (err) {
            console.error("Support request error:", err);
          }
        }
        
        const botMsg: Message = { sender: "bot", text: responseText, timestamp: new Date() };
        setSupportMessages((prev) => [...prev, botMsg]);
      }, 550);
    } else {
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setTimeout(() => {
        const responseText = generateBotResponse(query);
        const botMsg: Message = { sender: "bot", text: responseText, timestamp: new Date() };
        setMessages((prev) => [...prev, botMsg]);
      }, 605);
    }
  };

  // Helper to parse formatting inside the bot responses (bold markdown and list markers)
  const renderFormattedText = (text: string) => {
    return text.split("\n").map((line, idx) => {
      const trimmed = line.trim();
      const isBullet = trimmed.startsWith("-") || trimmed.startsWith("🔸") || trimmed.startsWith("🔹") || trimmed.startsWith("👉") || trimmed.startsWith("🔹") || trimmed.startsWith("🔸");
      
      // Split bold markdown syntax **text**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const content = parts.map((part, partIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={partIdx} className="font-extrabold text-slate-800 bg-slate-100 px-1 py-0.5 rounded text-[11px] border border-slate-200/50">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      return (
        <div key={idx} className={`${isBullet ? "pl-3 text-slate-700 font-semibold" : "text-slate-600 font-medium"} min-h-[1.2em] mb-1 leading-relaxed text-[11.5px]`}>
          {content}
        </div>
      );
    });
  };

  // Context-Aware dynamic recommendations / cross-questions bar
  const getDynamicQuickQuestions = () => {
    const hasPositions = positions.length > 0;
    const userMessages = messages.filter((m) => m.sender === "user");
    const lastUserQuery = userMessages.length > 0 ? userMessages[userMessages.length - 1].text.toLowerCase() : "";
    // Default general options
    let list = [
      { label: "🔮 Tomorrow's Forecast", text: "Predict tomorrow's market direction (rise/fall)" },
      { label: "🌅 BTST Suggestion?", text: "Suggest a BTST (Buy Today Sell Tomorrow) trade for tomorrow" },
      { label: "🌏 GIFT Nifty & Global", text: "Show current GIFT Nifty price and global market sentiment" },
      { label: "📈 Nifty Levels?", text: "What are the live support and resistance levels?" },
      { label: "🤖 Best Strategy?", text: "Kaunsi strategy use karein abhi live market me?" },
      { label: "💼 My Positions", text: "Show my open positions" },
    ];

    if (hasPositions) {
      // If user has active positions, prioritize hold/sell advice
      list.push({ label: "💡 Hold or Sell Advice?", text: "Should I hold or sell my active trade?" });

      // If user recently asked for hold/sell advice, provide deeper cross-questions
      if (
        lastUserQuery.includes("hold") ||
        lastUserQuery.includes("sell") ||
        lastUserQuery.includes("exit") ||
        lastUserQuery.includes("square") ||
        lastUserQuery.includes("nikal") ||
        lastUserQuery.includes("book") ||
        lastUserQuery.includes("kya karu") ||
        lastUserQuery.includes("bech")
      ) {
        return [
          { label: "❓ Kyu hold ya sell?", text: "Explain why you recommended holding or selling my active position." },
          { label: "🎯 Target & SL prices", text: "Show the exact target and stop loss levels for my current trade." },
          { label: "📉 Risk of Time Decay?", text: "Is my trade at risk of premium time decay (Theta)?" },
          { label: "📊 Show Live RSI", text: "Show the underlying index RSI and trend signal." },
        ];
      }

      // If user recently asked about target/SL
      if (lastUserQuery.includes("target") || lastUserQuery.includes("sl") || lastUserQuery.includes("stop loss") || lastUserQuery.includes("stop-loss")) {
        return [
          { label: "📈 Reversal Risk?", text: "What should I do if the market reverses against my target?" },
          { label: "💼 Active Trade Status", text: "Should I hold or sell my active trade?" },
          { label: "💰 Available margin", text: "Check my balance limit" },
        ];
      }

      // If user is asking about loss
      if (lastUserQuery.includes("loss") || lastUserQuery.includes("nuksan") || lastUserQuery.includes("loss ho") || lastUserQuery.includes("loss chal")) {
        return [
          { label: "⚠️ Cut loss now?", text: "Should I cut losses now or hold for a pullback?" },
          { label: "🛑 Safe Stop Loss?", text: "Where should I set my stop loss for safety?" },
          { label: "💼 Active Trade Status", text: "Should I hold or sell my active trade?" },
        ];
      }
    } else {
      // Suggest options chain trading if no active positions
      list.push({ label: "💡 Suggest Trade", text: "Suggest a trade based on current momentum" });
    }

    list.push({ label: "💰 Account Balance", text: "Check my balance limit" });
    list.push({ label: "🔑 Options Basics", text: "Explain CE vs PE basics" });

    return list;
  };

  const generateSupportResponse = (query: string): string => {
    const q = query.toLowerCase();

    if (q.includes("maintenance") || q.includes("weekly") || q.includes("update") || q.includes("maintanance")) {
      return "🔧 **SecureTrade Weekly Maintenance Schedule:**\n\n- **Timing:** Every Saturday from 11:00 PM to Sunday 03:00 AM IST.\n- **Action:** Live broker feeds aur API endpoints optimize kiye jaate hain aur options database ko refresh kiya jata hai.\n- **Status:** Maintenance ke dauran terminal feed paused ho sakti hai, par real trading hours me iska koi effect nahi padega. Aap secure feel karke trade kar sakte ho!";
    }

    if (q.includes("reset") || q.includes("balance") || q.includes("balance zero") || q.includes("paise") || q.includes("restore") || q.includes("simulated")) {
      return "💰 **Paper Money Balance Reset Guide:**\n\n1. Agar aapka balance close to zero hai aur aap reset karwana chahte hain, toh admin ke offline fee ₹200 record karwane par reset kiya jata hai.\n2. Payment check hone ke baad, Administrator Admin Panel se single-click karke aapka paper money balance ₹1,00,000 par restore kar dega.\n3. Koi issue ho toh admin (akshatmarwadi5@gmail.com) ko receipt send kar edin.";
    }

    if (q.includes("aadhar") || q.includes("aadhar card") || q.includes("pan") || q.includes("pan card") || q.includes("broker") || q.includes("upstox") || q.includes("zerodha") || q.includes("angel")) {
      return "🔒 **Verification Locks & Security Policy:**\n\n- Hum duplicate registrations aur payment bypasses ko rokne ke liye PAN, Aadhaar, ya Broker Client ID check karte hain.\n- Har ek trader ka ek hi single account verified reh sakta hai, jisse trading limits and commissions completely secure rehti hain.\n- Apne details register karte waqt exact document numbers use karein taaki dashboard block na ho.";
    }

    if (q.includes("limit order") || q.includes("pending order") || q.includes("limit") || q.includes("target price")) {
      return "🎯 **Pending Limit Orders Guide:**\n\n- **How to place:** Options Chain panel mein check out drawer khol kar Order Type ko **Limit** toggle karein.\n- **Limit Price:** Us target price ko enter karein jispe aap buy/sell karna chahte hain.\n- **Execution:** Backend engine real-time live LTP updates ko scan karega aur price hit hote hi auto-fill kar dega.";
    }

    if (q.includes("target") || q.includes("stop loss") || q.includes("sl")) {
      return "🛑 **Setting Target & Stop-Loss (SL):**\n\n- Positions tab mein trade ke collapse dropdown par click karein.\n- Custom Target (Take Profit) aur Stop-Loss prices set karke set limit confirm karein.\n- Jab index levels hit honge, browser sound notifications aayengi aur registered phone par SMS alert jayega.";
    }

    // Default Support fallback
    return "🔧 **Support Bot:** Bhai! Platform ke tech support desk par query received. Terminal related kuch aur details chahiye toh select karein:\n- **Weekly Maintenance**\n- **Balance Reset Process**\n- **Aadhaar/PAN Verification ID locks**\n- **Limit Order placement**\n\nMain humesha active hu, Antigravity AI aapke system issues fix karwa dega!";
  };

  // Chatbot Response Heuristic Logic with extensive cross-question support
  const generateBotResponse = (query: string): string => {
    const q = query.toLowerCase();

    // 1. BTST Trade Suggestions (Processed first to prevent collision with general 'sell' queries)
    if (q.includes("btst") || q.includes("buy today sell tomorrow") || q.includes("overnight") || q.includes("kal ke liye") || q.includes("hold kal")) {
      const niftyData = marketData["NIFTY50"];
      const bnData = marketData["BANKNIFTY"];
      
      const nPrice = niftyData ? niftyData.price : 24150;
      const nRsi = niftyData ? niftyData.rsi : 50;
      const nSignal = niftyData ? niftyData.signal : "WAIT";
      const nTargetMult = niftyData ? (niftyData.targetMultiplier ?? 1.8) : 1.8;
      
      const bnPrice = bnData ? bnData.price : 58000;
      const bnRsi = bnData ? bnData.rsi : 50;
      const bnSignal = bnData ? bnData.signal : "WAIT";

      let response = "🌅 **BTST (Buy Today, Sell Tomorrow) / Overnight Holding Analysis:**\n\n";

      // If market is sideways (targetMultiplier <= 1.3), warn about sideways decay and recommend avoiding BTST
      if (nTargetMult <= 1.3) {
        response += `❌ **No, BTST hold nahi karna chahiye!**\n\n`;
        response += `👉 **Reason:** Market abhi flat consolidate ho raha hai aur **sideways** rehne ke chances zyaada hain. Overnight holding mein **Theta Decay (Time Decay)** ki wajah se subah premium melt ho jayega aur bina matlab loss hoga.\n`;
        response += `👉 **Action:** Aaj koi BTST trade carry mat karo. Apne capital ko safe rakho aur kal fresh intraday momentum par trade karo.`;
      } 
      // If market is strongly bullish, suggest CE holding
      else if (nRsi > 58 || nSignal.includes("BUY") || bnRsi > 58) {
        const atmNifty = Math.round(nPrice / 50) * 50;
        response += `📈 **Yes, Bullish BTST hold kar sakte ho (CE Call)!**\n\n`;
        response += `- **Trade Idea:** Buy **NIFTY ${atmNifty} CE** at market close.\n`;
        response += `- **Reason:** Indices mein strong closing momentum hai aur RSI **${nRsi.toFixed(1)}** par bullish side biased hai. Global trends ke indicators bhi positive gap-up opening suggest kar rahe hain.\n`;
        response += `- **Exit Plan:** Kal subah 09:15 AM par opening spike aate hi profit book kar lena, zyaada greed mat karna.`;
      } 
      // If market is strongly bearish, suggest PE holding
      else if (nRsi < 42 || nSignal.includes("SELL") || bnRsi < 42) {
        const atmNifty = Math.round(nPrice / 50) * 50;
        response += `📉 **Yes, Bearish BTST hold kar sakte ho (PE Put)!**\n\n`;
        response += `- **Trade Idea:** Buy **NIFTY ${atmNifty} PE** at market close.\n`;
        response += `- **Reason:** Index levels high selling pressure show kar rahe hain (RSI: **${nRsi.toFixed(1)}**). Kal morning gap-down opening ki high probability hai.\n`;
        response += `- **Exit Plan:** Kal subah opening gap-down spike milte hi option bechkar profit book kar lena.`;
      } 
      // Default neutral/flat recommendation
      else {
        response += `⚖️ **BTST Avoid Karo (Neutral Market):**\n\n`;
        response += `- **Reason:** Nifty abhi exact central neutral range (RSI: **${nRsi.toFixed(1)}**) mein hai. Jab direction clear na ho, toh overnight position hold karna high risk hota hai.\n`;
        response += `- **Advice:** Flat range ke karan options decay hone ka darr hai. Aaj BTST carry mat karo.`;
      }
      
      response += "\n\n⚠️ *Disclaimer: Carry-forward trades are highly volatile. Standard paper trading limits apply!*";
      return response;
    }

    // 2. Open Positions Check
    if (q.includes("position") || q.includes("holding") || q.includes("active trade") || q.includes("open trade") || q.includes("portfoli")) {
      if (positions.length === 0) {
        return "💼 **Positions Status:**\n\nYou currently have no open positions. Go to the **Options Chain** tab to place a CE or PE trade! 🛒";
      }

      let reply = "💼 **Your Open Positions:**\n\n";
      positions.forEach(pos => {
        const qty = pos.quantity;
        const type = qty > 0 ? "BUY" : "SELL";
        const ltp = pos.livePrice ?? pos.averagePrice;
        const pnl = qty * (ltp - pos.averagePrice);
        const pnlText = pnl >= 0 ? `+₹${pnl.toFixed(2)}` : `-₹${Math.abs(pnl).toFixed(2)}`;
        reply += `🔸 **${pos.symbol.replace("NIFTY50", "NIFTY")}**\n   - Quantity: ${Math.abs(qty)} (${type})\n   - Avg Entry: ₹${pos.averagePrice.toFixed(2)} | LTP: ₹${ltp.toFixed(2)}\n   - P&L: **${pnlText}**\n\n`;
      });
      return reply;
    }

    // 2. Hold or Sell Recommendation (supporting Hinglish cross-questions)
    if (
      q.includes("hold") ||
      q.includes("sell") ||
      q.includes("exit") ||
      q.includes("square") ||
      q.includes("nikal") ||
      q.includes("book") ||
      q.includes("bech") ||
      q.includes("kya karu") ||
      q.includes("kya kare") ||
      q.includes("rakhu")
    ) {
      if (positions.length === 0) {
        return "💼 **Advisor Response:**\n\nAapka abhi koi active trade open nahi hai. Options Chain tab me jaakar Nifty ya BankNifty ka trade lein! 📈";
      }

      let reply = "🧠 **SecureTrade AI Advisor Recommendations:**\n\n";
      positions.forEach(pos => {
        const qty = pos.quantity;
        const ltp = pos.livePrice ?? pos.averagePrice;
        const pnl = qty * (ltp - pos.averagePrice);
        const pnlPct = pos.averagePrice > 0 ? (pnl / (Math.abs(qty) * pos.averagePrice)) * 100 : 0;
        
        const underlying = Object.keys(marketData).find(k => pos.symbol.includes(k)) || "NIFTY50";
        const indexData = marketData[underlying];
        const rsi = indexData ? indexData.rsi : 50;
        const signal = indexData ? indexData.signal : "WAIT";
        const isCall = pos.symbol.includes("CE");

        reply += `🔸 **${pos.symbol.replace("NIFTY50", "NIFTY")}** (Entry: ₹${pos.averagePrice.toFixed(2)} | LTP: ₹${ltp.toFixed(2)})\n`;
        
        if (pnl >= 0) {
          if (isCall) {
            if (rsi > 67) {
              reply += `👉 **Recommendation: SELL / BOOK PROFIT**\n   - RSI is overbought (${rsi.toFixed(1)}). Pullback likely. Don't be greedy, book profit or trail SL tightly at ₹${(ltp * 0.98).toFixed(2)}! 💰\n\n`;
            } else if (signal.includes("BUY")) {
              reply += `👉 **Recommendation: HOLD**\n   - Bullish trend is strong (RSI: ${rsi.toFixed(1)}, Signal: ${signal}). You can hold to target, keep stop-loss trailed at cost price (₹${pos.averagePrice.toFixed(2)}) for safety. 🚀\n\n`;
            } else {
              reply += `👉 **Recommendation: HOLD / TRAIL**\n   - Position is in profit (+${pnlPct.toFixed(1)}%). Consider booking partial profit or trailing SL close to secure gains.\n\n`;
            }
          } else {
            if (rsi < 33) {
              reply += `👉 **Recommendation: SELL / BOOK PROFIT**\n   - RSI is oversold (${rsi.toFixed(1)}). Pullback likely. Recommended to book profits now or trail SL tightly at ₹${(ltp * 0.98).toFixed(2)}! 💰\n\n`;
            } else if (signal.includes("SELL")) {
              reply += `👉 **Recommendation: HOLD**\n   - Bearish momentum is active (RSI: ${rsi.toFixed(1)}, Signal: ${signal}). Hold to catch further downside, trail SL at cost.\n\n`;
            } else {
              reply += `👉 **Recommendation: HOLD / TRAIL**\n   - Position is in profit (+${pnlPct.toFixed(1)}%). Secure your profits by booking or trailing SL close.\n\n`;
            }
          }
        } else {
          const lossPct = Math.abs(pnlPct);
          if (lossPct > 12) {
            reply += `👉 **Recommendation: EXIT (SQUARE OFF) ⚠️**\n   - Loss has exceeded 12% (-${lossPct.toFixed(1)}%). Holding further can lead to premium decay. Square off to protect your trading capital.\n\n`;
          } else if (isCall && signal.includes("SELL")) {
            reply += `👉 **Recommendation: EXIT (REDUCING RISK) ⚠️**\n   - You hold Call but index signal is bearish (${signal}). Cut your loss early to avoid time decay.\n\n`;
          } else if (!isCall && signal.includes("BUY")) {
            reply += `👉 **Recommendation: EXIT (REDUCING RISK) ⚠️**\n   - You hold Put but index signal is bullish (${signal}). Cut losses early to protect capital.\n\n`;
          } else {
            reply += `👉 **Recommendation: HOLD WITH ACTIVE SL**\n   - Minor loss of -${lossPct.toFixed(1)}%. Support is nearby. Keep your Stop-Loss at ₹${(pos.averagePrice * 0.88).toFixed(2)} active and monitor closely.\n\n`;
          }
        }
      });
      return reply;
    }

    // 3. Why-type Cross-Question ("Kyu hold karu?")
    if (q.includes("kyu") || q.includes("why") || q.includes("reason") || q.includes("logic")) {
      if (positions.length === 0) {
        return "💼 **AI Analysis:**\n\nAapka abhi koi open trade nahi hai, isliye hold/sell ka specific technical reason empty hai. Position lene par live RSI aur Moving Average signal details yahan check karein!";
      }
      
      let reply = "🧠 **Technicals behind recommendation:**\n\n";
      positions.forEach(pos => {
        const isCall = pos.symbol.includes("CE");
        const underlying = pos.symbol.includes("BANKNIFTY") ? "BANKNIFTY" : "NIFTY50";
        const indexData = marketData[underlying];
        const rsi = indexData ? indexData.rsi : 50;
        const signal = indexData ? indexData.signal : "WAIT";
        const qty = pos.quantity;
        const ltp = pos.livePrice ?? pos.averagePrice;
        const pnl = qty * (ltp - pos.averagePrice);
        const pnlPct = pos.averagePrice > 0 ? (pnl / (Math.abs(qty) * pos.averagePrice)) * 100 : 0;

        reply += `🔸 **${pos.symbol.replace("NIFTY50", "NIFTY")}**:\n`;
        if (pnlPct >= 0) {
          if (isCall) {
            reply += `- **Trend & RSI:** Spot Index ka RSI **${rsi.toFixed(1)}** hai. Kyuki RSI 65 se niche hai, calls me further space hai upward push ki. Moving averages show BUY trend.\n`;
          } else {
            reply += `- **Trend & RSI:** Spot Index ka RSI **${rsi.toFixed(1)}** hai. Kyuki RSI 35 se upar hai, further downside possibility is active. Moving averages show SELL trend.\n`;
          }
          reply += `- **Premium Value:** Options premium strong momentum holds value. Decay impact low.\n\n`;
        } else {
          reply += `- **Trend & RSI:** Spot Index ka RSI **${rsi.toFixed(1)}** (${signal}) hai. Option type ke reverse index trade kar raha hai. Pullback indicator weak.\n`;
          reply += `- **Decay Risk:** Options me Theta decay ho raha hai. Premium decrease continuous sideways movement me active ho jayega.\n\n`;
        }
      });
      return reply;
    }

    // 4. Target & Stop Loss Rules & Prices
    if (q.includes("target") || q.includes("sl") || q.includes("stop loss") || q.includes("stop-loss") || q.includes("kaha") || q.includes("kahan") || q.includes("level")) {
      if (positions.length === 0) {
        return "🎯 **Target & Stop-Loss Guidelines:**\n\n- **Golden Rule:** Option Buying me target **20% to 40%** aur Stop-Loss **10% to 12%** rakhein. Isse risk reward ratio 1:2 rehta hai.\n- Abhi koi position open nahi hai. Position lene par exact numerical levels yahan calculate ho jayenge!";
      }

      let reply = "🎯 **Target & Stop-Loss Levels for Active Trades:**\n\n";
      positions.forEach(pos => {
        const entry = pos.averagePrice;
        const target = entry * 1.25;
        const sl = entry * 0.88;
        reply += `🔸 **${pos.symbol.replace("NIFTY50", "NIFTY")}** (Avg Entry: ₹${entry.toFixed(2)}):\n`;
        reply += `   - **🎯 Target (+25%):** ₹${target.toFixed(2)}\n`;
        reply += `   - **🛑 Stop-Loss (-12%):** ₹${sl.toFixed(2)}\n`;
        reply += `   - **Live LTP:** ₹${(pos.livePrice ?? entry).toFixed(2)}\n\n`;
      });
      reply += "💡 *Note: Aap positions panel me parameters manually drag karke bhi target set kar sakte hain!*";
      return reply;
    }

    // 5. Support & Resistance Levels
    if (q.includes("support") || q.includes("resistance") || q.includes("level") || q.includes("s1") || q.includes("r1")) {
      const niftyData = marketData["NIFTY50"];
      const bnData = marketData["BANKNIFTY"];
      
      const nPrice = niftyData ? niftyData.price : 23500;
      const bnPrice = bnData ? bnData.price : 51000;

      let reply = "📊 **Live Technical Support & Resistance Levels:**\n\n";
      reply += `🔹 **NIFTY 50** (LTP: ₹${nPrice.toLocaleString("en-IN")}):\n`;
      reply += `   - **Resistance 2 (R2):** ₹${(nPrice + 130).toFixed(1)}\n`;
      reply += `   - **Resistance 1 (R1):** ₹${(nPrice + 70).toFixed(1)}\n`;
      reply += `   - **Support 1 (S1):** ₹${(nPrice - 70).toFixed(1)}\n`;
      reply += `   - **Support 2 (S2):** ₹${(nPrice - 130).toFixed(1)}\n\n`;

      reply += `🔹 **BANKNIFTY** (LTP: ₹${bnPrice.toLocaleString("en-IN")}):\n`;
      reply += `   - **Resistance 2 (R2):** ₹${(bnPrice + 450).toFixed(1)}\n`;
      reply += `   - **Resistance 1 (R1):** ₹${(bnPrice + 220).toFixed(1)}\n`;
      reply += `   - **Support 1 (S1):** ₹${(bnPrice - 220).toFixed(1)}\n`;
      reply += `   - **Support 2 (S2):** ₹${(bnPrice - 450).toFixed(1)}\n\n`;

      reply += "💡 *Trading Advice: S1/S2 supports are good bounce buy (CE) areas, while R1/R2 resistances are optimal bechne ke (PE) areas.*";
      return reply;
    }

    // 6. Loss Management Advice
    if (q.includes("loss") || q.includes("nuksan") || q.includes("minus") || q.includes("loss ho")) {
      if (positions.length > 0) {
        let reply = "⚠️ **Active Trade Loss Guidelines:**\n\n";
        positions.forEach(pos => {
          const ltp = pos.livePrice ?? pos.averagePrice;
          const pnl = pos.quantity * (ltp - pos.averagePrice);
          if (pnl < 0) {
            reply += `🔸 **${pos.symbol.replace("NIFTY50", "NIFTY")}** is currently in loss (**₹${pnl.toFixed(2)}**).\n   - **Option Rule:** Never average option buys. Premium decay will hurt capital.\n   - **Action:** If index signals turn against you, square off immediately. Don't wait for complete SL! 🛑\n\n`;
          }
        });
        if (reply.length > 30) return reply;
      }
      
      return "⚠️ **Option Loss Management Strategy:**\n\n1. **Stop Loss is God**: Agar aapka premium entry price se **10% se 12%** down ho jaye, toh immediately exit (cut loss) kar dein.\n2. **Never Average**: Loss-making option trade ko kabhi bhi average na karein.\n3. **Decay Warning**: Option buyers face premium decay (Theta). If market stays flat, premium decreases.";
    }

    // 7. Profit Booking Rules
    if (q.includes("profit") || q.includes("fayda") || q.includes("profit book") || q.includes("profit ho")) {
      if (positions.length > 0) {
        let reply = "💰 **Active Trade Profit Booking Advice:**\n\n";
        positions.forEach(pos => {
          const ltp = pos.livePrice ?? pos.averagePrice;
          const pnl = pos.quantity * (ltp - pos.averagePrice);
          if (pnl > 0) {
            reply += `🔸 **${pos.symbol.replace("NIFTY50", "NIFTY")}** is currently in profit (**+₹${pnl.toFixed(2)}**).\n   - **Action:** Trail SL to cost price (₹${pos.averagePrice.toFixed(2)}) for risk-free holding, or book 70% quantity now to secure money! 💰\n\n`;
          }
        });
        if (reply.length > 35) return reply;
      }

      return "💰 **Smart Profit Booking Guide:**\n\n1. **First Target (15-20%):** Book 70% quantities, trail rest to cost price.\n2. **Greed Control:** If RSI is overbought (>65) and index hits resistance, sell full position immediately.\n3. **SL Trailing:** Never let a winning trade turn into a losing trade.";
    }

    // 8. Time Decay (Theta) Explanation
    if (q.includes("decay") || q.includes("theta") || q.includes("time") || q.includes("galega") || q.includes("ghat")) {
      return "📉 **Time Decay (Theta) & Expiry Danger:**\n\n- Option buyers face **Theta Decay** daily. Prices drop even if index remains sideways.\n- **Expiry Day speed:** Expiry day par premium decay speed bullet jaisi hoti hai, and OTM options zero ho jate hain.\n- **Tip:** Scalp in high momentum. Do not hold option buys in flat consolidated ranges.";
    }

    // 9. Next Trade signal criteria
    if (q.includes("next trade") || q.includes("agla trade") || q.includes("next signal") || q.includes("signal kab")) {
      return "🔍 **Next Signal Scan Status:**\n\n- AI scanners are checking option chain inputs.\n- Signals generate when RSI bounds align (CE entry below 58, PE entry above 42) and moving averages cross.\n- Sound alerts will notify you instantly on terminal!";
    }

    // 10. GIFT Nifty & Global Markets Sentiment
    if (q.includes("gift") || q.includes("sgx") || q.includes("global") || q.includes("world")) {
      const niftyData = marketData["NIFTY50"];
      const nPrice = niftyData ? niftyData.price : 24500;
      
      const min = new Date().getMinutes();
      const variance = 35 + (min % 20) - (min % 8); // fluctuates premium between +27 and +55
      const giftPrice = nPrice + variance;
      
      let reply = "🌏 **GIFT Nifty & Global Markets Sentiment:**\n\n";
      reply += `🔸 **GIFT NIFTY**: **₹${giftPrice.toFixed(2)}**\n`;
      reply += `   - Premium/Spread: **+${variance.toFixed(2)} points** (Bullish Gap-up Bias)\n`;
      reply += `   - Status: Active Trading (NSE IX GIFT City)\n\n`;
      
      const dowDrift = (min % 15) - 7;
      const nasdaqDrift = (min % 10) - 5;
      const nikkeiDrift = (min % 25) - 12;
      
      reply += "🔹 **Global Indices (Simulated Live):**\n";
      reply += `- **Dow Jones (US):** 39,245.80 (${dowDrift >= 0 ? "+" : ""}${(dowDrift * 0.01).toFixed(2)}%)\n`;
      reply += `- **Nasdaq 100 (US):** 19,855.40 (${nasdaqDrift >= 0 ? "+" : ""}${(nasdaqDrift * 0.01).toFixed(2)}%)\n`;
      reply += `- **Nikkei 225 (Japan):** 38,784.20 (${nikkeiDrift >= 0 ? "+" : ""}${(nikkeiDrift * 0.02).toFixed(2)}%)\n`;
      reply += `- **FTSE 100 (London):** 8,244.10 (+0.12%)\n\n`;
      
      reply += `💡 *Market Interpretation: GIFT Nifty is trading at a premium of **+${variance.toFixed(0)} points** over Nifty 50 Spot (₹${nPrice.toFixed(2)}). This indicates a positive opening bias for Indian markets tomorrow morning.*`;
      return reply;
    }

    // (Old BTST Trade Suggestions block removed from here)

    // Tomorrow's Market Forecast
    if (q.includes("tomorrow") || q.includes("rise") || q.includes("fall") || q.includes("kal") || q.includes("predict") || q.includes("forecast") || q.includes("up or down") || q.includes("upar") || q.includes("niche")) {
      let response = "🔮 **Tomorrow's Market Forecast:**\n\n";
      const symbols = ["NIFTY50", "BANKNIFTY", "SENSEX"];
      let bullishCount = 0;
      let bearishCount = 0;

      symbols.forEach(sym => {
        const data = marketData[sym];
        if (data) {
          const rsiVal = data.rsi || 50;
          if (rsiVal < 45) bullishCount++;
          else if (rsiVal > 55) bearishCount++;
        }
      });

      if (bullishCount > bearishCount) {
        response += `📈 **Prediction: Bullish Bias (Market is expected to Rise)!**\n- Technical parameters highlight upward support.\n- **Kal market upar (rise) jaane ki probability zyaada hai.**\n- *Strategy: Buy on dips near support. CE options preferred.* 🚀`;
      } else if (bearishCount > bullishCount) {
        response += `📉 **Prediction: Bearish Bias (Market is expected to Fall)!**\n- Index exhibits overbought pressure.\n- **Kal profit booking ke sath market neeche (fall) ja sakta hai.**\n- *Strategy: Sell on rallies near resistance. PE options preferred.* 🐻`;
      } else {
        response += `⚖️ **Prediction: Sideways / Rangebound Consolidation!**\n- Flat indicators on key indices.\n- **Kal market consolidation range me sideways reh sakta hai.**\n- *Strategy: Range breakout watch out. Avoid long holdings.* 📊`;
      }
      response += "\n\n⚠️ *Technical parameters based projection. Virtual paper trading limits recommended.*";
      return response;
    }
    
    // Market Status Response
    if (q.includes("market") || q.includes("index") || q.includes("today") || q.includes("nifty") || q.includes("sensex") || q.includes("banknifty")) {
      let reply = "📊 **Live Market Status:**\n\n";
      const symbols = ["NIFTY50", "SENSEX", "BANKNIFTY"];
      symbols.forEach(sym => {
        const data = marketData[sym];
        if (data) {
          reply += `🔹 **${sym.replace("NIFTY50", "NIFTY")}**: ₹${data.price.toLocaleString("en-IN")} | RSI: ${data.rsi} (${data.signal})\n`;
        } else {
          reply += `🔹 **${sym.replace("NIFTY50", "NIFTY")}**: Data loading...\n`;
        }
      });
      return reply;
    }

    // Balance Check
    if (q.includes("balance") || q.includes("funds") || q.includes("margin") || q.includes("paise")) {
      return `💰 Your virtual account currently has **₹${balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}** available margin. You can execute orders directly from the Options Chain!`;
    }

    // Options Explanation
    if (q.includes("ce") || q.includes("pe") || q.includes("option") || q.includes("call") || q.includes("put")) {
      return `📊 **Options Trading Basics Simplified:**\n\n1. **CE (Call Option)**: Buy CE if you expect the market to go **UP** 📈.\n2. **PE (Put Option)**: Buy PE if you expect the market to go **DOWN** 📉.\n\n*Click on Strike prices in the Options Chain to view live premiums and place orders directly!*`;
    }

    // Strategy & Indicator Suggestions
    if (
      q.includes("strategy") || 
      q.includes("staretgy") || 
      q.includes("indicator") || 
      q.includes("lagana") || 
      q.includes("lagane") || 
      q.includes("kaunsi") || 
      q.includes("konsi") || 
      q.includes("best") ||
      q.includes("suggest")
    ) {
      const activeSym = selectedSymbol || "NIFTY50";
      const data = marketData[activeSym];
      
      let reply = `🤖 **SecureTrade Strategy & Indicator Advisor:**\n\n`;
      reply += `Selected Index: **${activeSym.replace("NIFTY50", "NIFTY")}**\n`;
      
      if (data) {
        const rsi = data.rsi ?? 50;
        const targetMultiplier = data.targetMultiplier ?? 1.8;
        
        reply += `🔹 **Current Live Indicators:**\n`;
        reply += `- Index price: **₹${data.price.toLocaleString("en-IN")}**\n`;
        reply += `- RSI (14): **${rsi.toFixed(1)}**\n`;
        
        // Analyze market state using dynamic slope / targetMultiplier
        if (targetMultiplier <= 1.3) {
          reply += `- Market Trend: **Sideways / Range-Bound (Flat) ⚖️**\n\n`;
          reply += `👉 **Suggested Strategy: 🕯️ 5EMA or RANGE trading**\n`;
          reply += `- **Why?** Moving Average crossovers flat market me bohot saare fake signals dete hain. 5EMA reversal and key levels best work karenge. Aap automatic trading off bhi rakh sakte hain loss se bachne ke liye.`;
        } else if (targetMultiplier >= 2.4) {
          reply += `- Market Trend: **Strong Momentum / Trending 🚀**\n\n`;
          reply += `👉 **Suggested Strategy: 📈 EMA CROSS or GAINZ ALGO**\n`;
          reply += `- **Why?** Strong market trend me trend-following strategies best perform karti hain. EMA CROSS jaldi entry dilaega aur GAINZ ALGO strong confirmation ke sath bade profit book karega.`;
        } else {
          reply += `- Market Trend: **Moderate Momentum Trend 📊**\n\n`;
          reply += `👉 **Suggested Strategy: 🚀 GAINZ ALGO**\n`;
          reply += `- **Why?** Gainz Algo strategy trend direction and RSI check karke entry leti hai, jo normal moderate conditions me fake breakouts filter karti hai aur trade ko safe rakhti hai.`;
        }
      } else {
        reply += `⚠️ Live market indicators data loading... Please wait a few seconds and try again.`;
      }
      return reply;
    }

    // Trade Suggestion / Signal Recommendation (Akshat's Sideways Guard)
    if (
      q.includes("suggest a trade") || 
      q.includes("trade suggest") || 
      q.includes("agla trade") || 
      q.includes("trade recommendation") || 
      q.includes("recommend a trade") ||
      q.includes("trade suggestion")
    ) {
      const activeSym = selectedSymbol || "NIFTY50";
      const data = marketData[activeSym];
      const nPrice = data ? data.price : 24150;
      const rsi = data ? data.rsi : 50;
      const targetMultiplier = data ? (data.targetMultiplier ?? 1.8) : 1.8;
      const atmStrike = Math.round(nPrice / 50) * 50;
      
      const isCall = rsi >= 48;
      const symbolSuggest = `${activeSym.replace("50", "")} 07 JUL 26 ${atmStrike} ${isCall ? "CE" : "PE"}`;

      if (targetMultiplier <= 1.3) {
        return `⚠️ **Sideways Market Alert (Aaj Bot Ka Din Nahi Hai!):**\n\nBhai, aaj market range-bound aur sideways chal raha hai. Aise market mein time decay aur fake signals ka risk bohot zyaada hota hai. **Mera suggestion hai ki aaj bot off rakho ya sirf Paper Trading use karo.**\n\nPar agar aap fir bhi trade karna chahte hain, toh main aapko ek **Highly Secure / Safe Trade** suggest karta hu with **Nominal Profit**:\n\n- **Suggest Option:** **${symbolSuggest}**\n- **Safe Entry Range:** Near current premium LTP\n- **🎯 Safe Target (+10%):** Nominal profit book karke exit karein.\n- **🛑 Safe Stop-Loss (-6%):** Tighter risk control.\n\n*Aise flat days par capital safe rakhna hi sabse bada profit hota hai, bhai!*`;
      } else {
        return `🚀 **Trending Market Signal (High Confidence Setup):**\n\nBhai, aaj market mein accha momentum hai! Hum standard targets ke sath trade execute kar sakte hain:\n\n- **Suggest Option:** **${symbolSuggest}**\n- **Active Signal:** ${data ? data.signal : "BUY"}\n- **🎯 Target (+25%):** Standard momentum target.\n- **🛑 Stop-Loss (-12%):** Regular protection check.\n\n*Execute paper trade or limit order near entry for best risk-reward!*`;
      }
    }

    // Greetings
    if (q.includes("hi") || q.includes("hello") || q.includes("hey") || q.includes("bhai") || q.includes("kaise")) {
      return "Bhai! Aapka swagat hai. Main SecureTrade AI Bot hu. Live trends, tomorrow's forecast, hold/sell advice, ya support-resistance levels ke baare me kuch bhi puchho! 📈🤖";
    }

    // Fallback
    return "Bhai, query understood! Is topic par specific calculation scan karne ke liye below dynamic cross-questions button use karein! 👇";
  };

  return (
    <>
      {/* Floating Chat Bubble */}
      <button
        id="chatbot-floating-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-40 bg-gradient-to-tr from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-full p-4 shadow-xl cursor-pointer transition-all hover:scale-110 active:scale-95 flex items-center justify-center border border-white/20"
        title="AI Advisor Chat"
      >
        {isOpen ? <X className="w-6 h-6 animate-pulse" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="fixed bottom-36 right-4 lg:bottom-24 lg:right-6 w-80 md:w-[380px] h-[490px] bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-2xl z-40 flex flex-col overflow-hidden animate-slide-up">
          
          {/* Header */}
          <div className="bg-slate-50/80 border-b border-slate-200/60 flex flex-col bg-gradient-to-r from-blue-50/50 to-white/50">
            <div className="p-4 flex justify-between items-center pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-blue-500 rounded-lg flex items-center justify-center text-white shadow-md">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-slate-800 font-extrabold text-xs flex items-center gap-1.5 leading-none">
                    {activeTab === "advisor" ? "AI Advisor Bot" : "Tech Support Desk"} <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                  </h3>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-1 leading-none">Live Terminal Support</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={clearHistory} 
                  className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                  title="Clear Chat History"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Support Tabs */}
            <div className="flex px-4 pb-2 gap-2 text-[10px] font-bold text-slate-500">
              <button
                type="button"
                onClick={() => { setActiveTab("advisor"); }}
                className={`flex-1 py-1 rounded-md text-center transition-all cursor-pointer ${
                  activeTab === "advisor"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                📊 Market Advisor
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("support"); }}
                className={`flex-1 py-1 rounded-md text-center transition-all cursor-pointer ${
                  activeTab === "support"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                🔧 Support Desk
              </button>
            </div>
          </div>

          {/* Messages Log */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 scrollbar-thin bg-slate-50/30">
            {(activeTab === "advisor" ? messages : supportMessages).map((msg, idx) => (
              <div key={idx} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-2xs ${
                  msg.sender === "user"
                    ? "bg-gradient-to-tr from-blue-600 to-blue-500 text-white rounded-tr-none text-xs font-semibold"
                    : "bg-white text-slate-700 rounded-tl-none border border-slate-200/80 shadow-3xs"
                }`}>
                  {msg.sender === "user" ? msg.text : renderFormattedText(msg.text)}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions suggestion row */}
          <div className="p-2 border-t border-slate-100 bg-slate-50/60 flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none">
            {(activeTab === "advisor" ? getDynamicQuickQuestions() : [
              { label: "🔧 Weekly Maintenance?", text: "What is the weekly maintenance schedule?" },
              { label: "💰 Simulated Balance Reset?", text: "How can I reset my simulated account balance?" },
              { label: "🔒 Aadhaar/PAN Locking?", text: "Why do you lock registrations using Aadhaar or PAN?" },
              { label: "🎯 Limit Orders Help?", text: "How to use pending limit orders?" },
            ]).map((q) => (
              <button
                key={q.label}
                onClick={() => handleSend(q.text)}
                className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl text-[10.5px] font-extrabold text-slate-600 hover:border-slate-350 transition-all shrink-0 cursor-pointer shadow-3xs hover:scale-102"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="p-3 border-t border-slate-200/80 bg-white flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask AI Advisor (Hinglish/English)..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none transition-all placeholder-slate-400"
            />
            <button
              type="submit"
              className="p-2 bg-gradient-to-tr from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl transition-all shadow-md active:scale-95 shrink-0 flex items-center justify-center cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}
    </>
  );
}

