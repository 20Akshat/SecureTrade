# SecureTrade v2.0 Walkthrough 🚀

We successfully transformed our single-page application into a **Pro Trading Terminal** that mimics the layout and capabilities of enterprise apps like Angel One.

## 🌟 What We Accomplished

### 1. Global State Management (React Context API)
We created a "Virtual Memory" for our app so data can be accessed from any page without passing props manually.
- **`AuthContext.tsx`**: Manages the user's login state and wallet balance globally.
- **`MarketContext.tsx`**: Manages the persistent WebSocket connection, live RSI calculation, and the Auto-Trade logic.

### 2. Multi-Page Architecture (Next.js App Router)
We implemented Next.js File-Based Routing to separate concerns into dedicated pages:
- **`/` (Gateway)**: A secure login screen.
- **`/dashboard` (Live Terminal)**: Houses the Trading Chart, the AI Bot Control, and the Manual Order Panel in a cohesive 3-column layout.
- **`/portfolio`**: Displays a professional "Holdings" data table tracking P&L.
- **`/orders` & `/account`**: Setup as structure for future expansion.

### 3. Professional UI/UX
- **Sidebar Navigation**: Built a fixed sidebar for seamless navigation without page reloads (SPA).
- **Dark Mode Aesthetics**: Utilized TailwindCSS to create a sleek `bg-black` theme with glowing accents, glassmorphism (`backdrop-blur-xl`), and conditionally colored UI elements (Green for Buy, Red for Sell).

### 4. Auto-Trade Engine & Cyber Security
- **Toggle Mechanism**: Added a sleek iOS-style toggle switch to activate/deactivate the bot.
- **Automated Execution**: The bot now automatically executes API calls to `/api/buy` or `/api/sell` based on RSI signals when active.
- **DDoS Protection**: We witnessed our own Cyber Security layer in action when the backend's `express-rate-limit` blocked the bot for sending too many requests, which we then optimized!

## 🛠️ Key Interview Concepts Mastered
- **React**: Context API, `useState`, `useEffect`, `useRef`.
- **Next.js**: File-based routing, Layouts vs. Pages, Client vs. Server components.
- **Node.js**: CommonJS (`require`/`module.exports`), Rate Limiting (DDoS prevention).
- **CSS/Tailwind**: Flexbox, CSS Grid (`grid-cols-12`), Conditional Styling.
