# MERN Stack Interview Preparation Plan 🎯

The SecureTrade Pro project is complete! You now have a working AI-trading terminal.
As requested, the next phase is focused purely on **Interview Preparation** for HTML, CSS, JS, and the MERN stack (Node.js, React).

We will use the code *you just wrote* as practical examples. This makes explaining complex concepts much easier because you've already seen them work!

## Proposed Curriculum

### Module 1: The Foundations (HTML, CSS, & Tailwind)
- **HTML Semantics**: Why we used `<header>`, `<nav>`, and `<main>` instead of just `<div>`.
- **CSS Flexbox & Grid**: How we built the 3-column layout in `dashboard/page.tsx` (`grid-cols-12`).
- **Modern UI Styling**: Explaining Tailwind concepts like `backdrop-blur` (Glassmorphism) and responsive design.

### Module 2: Core JavaScript & React Mastery
- **State vs. Props**: Understanding how data flows (e.g., passing `currentPrice` to `PortfolioPanel`).
- **React Hooks**:
  - `useState`: How we managed the Bot's ON/OFF toggle.
  - `useEffect`: How we connected the WebSocket without freezing the browser.
  - `useRef`: Why we needed it to stop the bot from infinitely looping.
- **Context API**: How `AuthContext` acts as "Global Memory" replacing Redux for simple state.

### Module 3: Node.js & Backend Architecture (Express)
- **RESTful APIs**: How `POST /api/buy` actually works under the hood.
- **Middlewares**: Explaining the Cyber Security layers we built (Rate Limiting, Helmet).
- **WebSockets**: The difference between standard HTTP requests (waiting for a response) and WebSockets (live data streams).

### Module 4: Authentication & Databases
- **JWT (JSON Web Tokens)**: How the "Smart Key-Card" system works for stateless authentication.
- **Password Hashing**: Why we used `bcrypt` in the signup route.
- **Relational Data**: How the `users` table connects to the `portfolio` table.

## Verification Plan
After each module, I will ask you 2-3 common interview questions. You will try to answer them based on the SecureTrade code, and I will help refine your answers into "Interview-Ready" responses.
