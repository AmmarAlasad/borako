# ✅ Recommended Tech Stack (Easy Host, Works on Phones, No Game Server)

## Core Goal
- Runs in any browser (mobile + desktop)
- One player is **Host** (authoritative rules + state)
- Real-time multiplayer via **P2P**
- No dedicated game server storing game state

---

## 1) Frontend (UI)
- **Vite** (build + dev server)
- **React + TypeScript** (app + game UI)
- **Tailwind CSS** (styling)
- **shadcn/ui** (modern UI components: dialogs, buttons, menus, tabs)
- **Framer Motion** (smooth animations for dealing cards, transitions)

---

## 2) Game Logic (Rules Engine)
- **TypeScript game engine** (pure functions + state machine)
  - Reducer-style state updates or
  - **XState** (optional) for clean turn/phase management

Recommended pattern:
- **Host-authoritative**: only Host validates moves + updates `gameState`

---

## 3) Networking (Online Multiplayer)
- **WebRTC DataChannels** (real-time P2P data)
- **PeerJS** (simplifies WebRTC connections)

Signaling:
- **PeerJS Cloud** (signaling/broker only — no game state stored)

Message types (example):
- `ACTION` (client → host): draw, sweep, open meld, add to meld, discard...
- `STATE_UPDATE` (host → all): latest state snapshot/patch
- `ERROR` (host → client): invalid move feedback

---

## 4) Mobile-Friendly App Delivery
- **PWA** (installable web app)
- `vite-plugin-pwa` (service worker + manifest)

Benefits:
- Add to Home Screen (iOS/Android)
- Fullscreen mode
- Better mobile experience

---

## 5) Storage (Optional, Local Only)
- **LocalStorage / IndexedDB**
  - store player name, settings, last room code
  - (optional) store last known state for reconnect UX

---

## 6) Hosting (Static)
Any static host works:
- **Cloudflare Pages** (recommended)
- Netlify / Vercel / GitHub Pages

Deployment output:
- static HTML/CSS/JS bundle from Vite

---

## 7) Dev & Quality Tools (Optional but Helpful)
- **ESLint + Prettier** (code quality + formatting)
- **Zod** (runtime validation for network messages)
- **Vitest** (unit tests for rules engine)

---

## Summary (One-Line)
**Vite + React/TS + Tailwind/shadcn + PWA + PeerJS(WebRTC) + Host-authoritative rules engine**, deployed as a static site on Cloudflare Pages.
