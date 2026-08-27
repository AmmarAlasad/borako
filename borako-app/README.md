# 🃏 Borako (بوراقو) — App

![React 19](https://img.shields.io/badge/React-19.2-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-7.3-646CFF?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.1-38B2AC?logo=tailwind-css)
![PeerJS](https://img.shields.io/badge/WebRTC-PeerJS-orange)

A modern, real-time, peer-to-peer multiplayer web application for the **Borako** card game, built with React 19, TypeScript, Vite, Tailwind CSS, and WebRTC (PeerJS).

---

## 📖 Complete Rules & Documentation

For the full detailed rulebook, scoring formulas, and architectural guides, see:
- [📘 Root README.md with Detailed English Rules](../README.md)
- [📜 English Rules Reference (rules_en.md)](../rules_en.md)
- [📜 Arabic Rules Reference (rules_ar.md)](../rules_ar.md)
- [🏗 Architecture Diagram](./borako_architecture.puml)

---

## ⚡ Quick Rules Summary

- **Players**: 4 players (2 teams of 2).
- **Target**: First team to reach **350 match points**.
- **Deck**: 106 cards (2 standard decks + 2 Devil Jokers 🃏).
- **Deal**: 11 cards per player hand + two 11-card **Mour** reserve piles (1 per team).
- **Turn Actions**:
  1. **Draw** 1 card from Stock OR **Sweep (*Takweesh*)** the entire discard pile (must meld immediately).
  2. Melds: Runs (3+ same suit) or Sets (allowed **ONLY** for **A, 2, 3**).
  3. End turn: Discard 1 card.
- **"2" Rule**: Natural in sequence (e.g. 2♥-3♥-4♥) or Wild substitute (e.g. 5-2-7).
- **7+ Card Bonuses**:
  - Clean Run: **+200** | Dirty Run: **+100**
  - Clean Set (A, 3): **+300** | Dirty Set: **+150**
  - Clean Set (2s): **+400** | Dirty Set: **+200**
- **Penalties & Bonuses**:
  - Never taking Mour: **-100 round pts** (-10 team pts).
  - Going Out: **+100 round pts** (+10 team pts).
  - Final score: $(\text{Meld Bonuses} / 10) + \sum\text{Melded Cards} - \sum\text{Hand Cards} \pm \text{Mour/Out}$.

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Build production bundle
npm run build
```
