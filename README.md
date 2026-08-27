# 🃏 Borako (بوراقو) — Multiplayer Card Game

![React 19](https://img.shields.io/badge/React-19.2-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-7.3-646CFF?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.1-38B2AC?logo=tailwind-css)
![PeerJS](https://img.shields.io/badge/WebRTC-PeerJS-orange)
![License](https://img.shields.io/badge/License-MIT-green)

A modern, real-time, peer-to-peer 4-player team card game implementation of **Borako** (a popular Mediterranean / Levantine card game closely related to Buraco and Canasta). Built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, **Framer Motion**, and serverless **WebRTC DataChannels (PeerJS)**.

---

## 📑 Table of Contents
1. [🌟 Features](#-features)
2. [📖 Official Borako Game Rules](#-official-borako-game-rules)
   - [1. Cards, Decks & Players](#1-cards-decks--players)
   - [2. Setup & Table Layout](#2-setup--table-layout)
   - [3. Turn Sequence (Draw vs. Sweep / Takweesh)](#3-turn-sequence-draw-vs-sweep--takweesh)
   - [4. Melds & Opening Requirements](#4-melds--opening-requirements)
   - [5. The "2" Card & Wild Substitutions](#5-the-2-card--wild-substitutions)
   - [6. Standard Run Melds (Same-Suit Sequences)](#6-standard-run-melds-same-suit-sequences)
   - [7. Special Group Melds (Sets — A, 2, 3 Only)](#7-special-group-melds-sets--a-2-3-only)
   - [8. The Mour (Reserve Pile) & Penalties](#8-the-mour-reserve-pile--penalties)
   - [9. Card Point Values](#9-card-point-values)
   - [10. Round Scoring & Match Total](#10-round-scoring--match-total)
3. [💻 Tech Stack](#-tech-stack)
4. [🏛️ Architecture & Networking](#️-architecture--networking)
5. [📁 Project Structure](#-project-structure)
6. [🚀 Getting Started](#-getting-started)
7. [🧪 Running Tests & Quality Checks](#-running-tests--quality-checks)
8. [📄 License](#-license)

---

## 🌟 Features

- **🎮 4-Player 2v2 Team Play**: Play in two competing pairs (Team A vs Team B) with shared meld areas.
- **🌐 Serverless Real-Time Multiplayer**: Instant peer-to-peer multiplayer using **WebRTC (PeerJS)** with no dedicated backend server required.
- **⚡ Host-Authoritative Game Engine**: Deterministic rules engine with state verification, automatic turn rotations, meld validation, and live score recalculation.
- **🃏 Rich Card Mechanics**: Supports natural runs, wild "2" substitutions, Joker cards, Sets of A/2/3, Sweep (*Takweesh*), and Mour pickups.
- **✨ Smooth Animations & Sound**: Card dealing, dragging, drawing, and melding animations powered by **Framer Motion**.
- **📱 Fully Responsive UI**: Mobile & desktop ready with dark-mode glassmorphism design.

---

## 📖 Official Borako Game Rules

> Borako is played by **4 players in 2 fixed partnerships** sitting opposite each other. The goal is to meld cards into valid combinations, close out 7+ card melds (*Borakos*), pick up the team reserve (*Mour*), and be the first team to reach **350 match points**.

---

### 1. Cards, Decks & Players

- **Decks**: Two standard 52-card decks combined + **2 Devil Jokers 🃏** = **106 cards total**.
- **Duplication**: Because two decks are combined, every standard card appears **twice** in the game (e.g., there are two $7\heartsuit$ cards).
- **Suits & Traditional Names**:
  - ♣️ **Clubs** (*Zahr*)
  - ♦️ **Diamonds** (*Dinar*)
  - ♠️ **Spades** (*Sabat*)
  - ♥️ **Hearts** (*Qalb*)
- **Players**: 4 players divided into **2 teams of 2** (Partners sit across from each other).
- **Match Target**: First team to accumulate **350 total team points** wins the match.

---

### 2. Setup & Table Layout

1. **Dealing**:
   - Each player is dealt **11 cards** in their starting hand.
   - Two separate face-down piles of **11 cards each** are dealt and set aside: these are the **Mour (الـمور)** piles (one reserved for Team A, one for Team B).
2. **Table Zones**:
   - **Draw Pile (Stock)**: The remaining cards placed face-down in the center.
   - **Discard Pile**: The face-up discard stack where players discard at the end of their turns.
   - **Team Meld Areas**: Separate play areas on the table for Team A's melds and Team B's melds.

```
                  [ Partner (Team A/B) ]
                            ▲
                            │
  [ Opponent Left ] ─── [ TABLE ] ─── [ Opponent Right ]
                        ┌────────┐
                        │ Draw   │ [ Discard Pile ]
                        │ Pile   │
                        └────────┘
                     [Team A]  [Team B]
                      Melds     Melds
                            │
                            ▼
                     [ You (Player) ]
```

---

### 3. Turn Sequence (Draw vs. Sweep / Takweesh)

On your turn, you must perform the following three steps in order:

#### Step 1: Start Turn (Choose Draw OR Sweep)
You must choose **exactly one** action:
1. **Draw from Stock**: Take **1 card** from the face-down Draw pile.  
   *OR*
2. **Sweep the Discard Pile (*Takweesh / تكويش*)**: Pick up the **entire discard pile** into your hand.
   - **Sweep Requirement**: If you choose to sweep, you **MUST immediately** either:
     - Open a new valid meld for your team, **OR**
     - Add at least one card to an existing meld of your team.

> ⚠️ **Note**: You cannot draw from the deck and sweep on the same turn.

#### Step 2: Meld & Extend (Optional)
- You may place down new valid melds (runs or allowed sets) onto your team's meld area.
- You may extend your team's existing melds by adding valid matching cards.
- *(You cannot add cards to your opponents' melds).*

#### Step 3: End Turn (Discard)
- You must end your turn by discarding **one card** face-up onto the Discard pile.

---

### 4. Melds & Opening Requirements

A **meld** is a combination of cards laid face-up on the table belonging to a team.

- **Minimum Size**: Every new meld must contain at least **3 cards**.
- **Valid Meld Types**:
  1. **Runs (Sequences)**: Consecutive cards in the **same suit** (e.g., $5\heartsuit\ 6\heartsuit\ 7\heartsuit$).
  2. **Special Sets (Groups)**: Three or more cards of the **same rank** (allowed **only** for **Aces**, **2s**, and **3s**).

---

### 5. The "2" Card & Wild Substitutions

The **2** card has a unique, flexible role in Borako:

```
                      ┌───────────────────────────────┐
                      │        The "2" Card Role      │
                      └──────────────┬────────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
   [ Natural 2 ]                                       [ Wild / Substitute ]
   • Sits in natural position (2-3-4...)               • Replaces a missing rank (e.g. 5-2-7)
   • Matches the run's suit                            • Can come from ANY suit
   • Does NOT count as a wild                          • Counts as a wild for scoring
```

1. **Natural "2"**:
   - When a 2 is placed in its natural numerical rank within a sequence of its own suit (e.g., $2\heartsuit\ 3\heartsuit\ 4\heartsuit\ 5\heartsuit$), it is a **natural 2** and does **not** count as a wild card.
2. **Wild / Substitute "2"**:
   - When a 2 is used to substitute for any missing rank in a sequence (e.g., $2\heartsuit\ 3\heartsuit\ 4\heartsuit\ 5\heartsuit\ 2\diamondsuit\ 7\heartsuit\ 8\heartsuit$, where $2\diamondsuit$ replaces $6\heartsuit$), it acts as a **wild card**.
3. **Devil Joker (🃏)**:
   - Always acts as a wild card substitute.
4. **Wild Card Limit**:
   - A single run may contain at most **one wild card** to qualify for a meld bonus. If a run contains 2 wilds, it receives **no meld bonus** (though card values still count).

---

### 6. Standard Run Melds (Same-Suit Sequences)

Runs consist of consecutive cards of the same suit. Once a run reaches **7 or more cards**, it becomes a completed Borako and earns large bonus points:

| Run Size | Composition / Wild Count | Bonus Points |
| :--- | :--- | :---: |
| **< 7 cards** | Any valid combination | **0** *(card values only)* |
| **7+ cards** | **Clean Run** (No wilds / substitutes) | **+200** |
| **7+ cards** | **Dirty Run** (Contains exactly 1 wild card) | **+100** |
| **7+ cards** | **2+ Wilds** | **0** *(card values only)* |

> 📌 **Rule Note**: A team must have at least one **200+ point meld** (a clean run or clean set) before their 100-point dirty runs can count toward the bonus total.

#### Examples:
- $2\heartsuit\ 3\heartsuit\ 4\heartsuit\ 5\heartsuit\ 6\heartsuit\ 7\heartsuit\ 8\heartsuit$ $\rightarrow$ **Clean 7-card run = 200 pts**
- $2\heartsuit\ 3\heartsuit\ 4\heartsuit\ 5\heartsuit\ 2\diamondsuit\ 7\heartsuit\ 8\heartsuit$ (where $2\diamondsuit$ is $6\heartsuit$) $\rightarrow$ **Dirty 7-card run = 100 pts**
- $2\heartsuit\ 3\heartsuit\ 4\heartsuit\ 5\heartsuit\ 6\heartsuit\ 7\heartsuit\ 🃏$ (here $2\heartsuit$ is natural, Joker is wild) $\rightarrow$ **Dirty 7-card run = 100 pts**

---

### 7. Special Group Melds (Sets — A, 2, 3 Only)

Unlike standard Rummy or Canasta, group sets (cards of the same rank) are **strictly restricted**:

- ✅ **Allowed Sets**: **Aces (A)**, **Twos (2)**, and **Threes (3)**.
- ❌ **Forbidden Sets**: Any other rank ($4, 5, 6, 7, 8, 9, 10, J, Q, K$) cannot be melded as a set.

#### 7-Card Completed Set Bonuses:

| Set Type | Clean (No Wilds) | Dirty (with 1 Joker 🃏) |
| :--- | :---: | :---: |
| **Seven 3s** ($3\text{-}3\text{-}3\text{-}3\text{-}3\text{-}3\text{-}3$) | **+300** | **+150** |
| **Seven Aces** ($\text{A-A-A-A-A-A-A}$) | **+300** | **+150** |
| **Seven 2s** ($2\text{-}2\text{-}2\text{-}2\text{-}2\text{-}2\text{-}2$) | **+400** | **+200** |

---

### 8. The Mour (Reserve Pile) & Penalties

- **Taking the Mour**: When a player plays the last card from their hand (hand reaches 0 cards), their team immediately picks up their reserved **11-card Mour pile** and continues playing.
- **Mour Penalty**: If the round ends (an opposing player closes out or the draw deck runs out) and a team **never took their Mour pile**, that team receives a severe penalty:
  - **$-100$ round points** (which equals **$-10$ team total points**).
- **Going Out Bonus (تسكير)**: The player who legally plays their last card after their team has already taken the Mour closes the round, earning **+10 team points** (+100 round points) for their team.

---

### 9. Card Point Values

Individual cards within melds and remaining in hands have the following point values:

| Card Rank | Face Value |
| :--- | :---: |
| **Ace (A)** | **1.5 pts** |
| **King, Queen, Jack, 10, 9, 8** | **1.0 pt** |
| **2** (Natural or Wild) | **1.0 pt** |
| **7, 6, 5, 4, 3** | **0.5 pts** |

---

### 10. Round Scoring & Match Total

At the end of each round:
1. **Meld Bonuses**: Sum all 7+ card bonuses ($200, 100, 300, 400, 150, 200$) and divide by 10.
2. **Meld Card Values**: Add the face value sum of all cards in your team's melds.
3. **Going Out Bonus**: Add $+10$ points if your team closed the round.
4. **Hand Card Penalty**: Subtract the face value sum of all cards remaining in your team players' hands.
5. **Mour Penalty**: Subtract $-10$ points if your team never took the Mour.

$$\text{Final Team Round Score} = \left(\frac{\text{Meld Bonuses}}{10}\right) + \sum(\text{Cards in Melds}) + \text{Go-Out (10)} - \sum(\text{Cards in Hand}) - \text{Mour Penalty (10)}$$

#### Scoring Example:
- Team Melds:
  - Clean 7-card run ($+200$ bonus $\rightarrow 20$ pts)
  - Dirty 7-card run ($+100$ bonus $\rightarrow 10$ pts)
  - Total card face values in melds = $42\text{ pts}$
- Cards remaining in partners' hands = $12\text{ pts}$ (subtracted)
- Took the Mour = Yes (no penalty)
- **Calculation**: $(20 + 10 + 42) - 12 = \mathbf{60\text{ points}}$ added to the team's match total.

🏆 **Winning**: The first team to reach **350 match points** wins the game!

---

## 💻 Tech Stack

- **UI Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Dev Server**: [Vite 7](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) + CSS Variables
- **Animations**: [Framer Motion 12](https://www.framer.com/motion/)
- **Icons & UI Primitives**: [Lucide React](https://lucide.dev/) & [Radix UI](https://www.radix-ui.com/)
- **Networking**: [PeerJS](https://peerjs.com/) (WebRTC DataChannels) for serverless P2P communication
- **Schema & Validation**: [Zod](https://zod.dev/)

---

## 🏛️ Architecture & Networking

```
┌────────────────────────────────────────────────────────┐
│                   Host Player (Room Leader)            │
│  ┌──────────────────────────────────────────────────┐  │
│  │           Authoritative Game Engine              │  │
│  │    (Validator, Reducer, State Machine, Scoring)  │  │
│  └────────────────────────┬─────────────────────────┘  │
└───────────────────────────┼────────────────────────────┘
                            │ WebRTC DataChannels (PeerJS)
           ┌────────────────┴────────────────┐
           ▼                                 ▼
┌──────────────────────┐          ┌──────────────────────┐
│   Peer Client 1      │          │   Peer Client 2      │
│   (Player 2 - View)  │          │   (Player 3 - View)  │
└──────────────────────┘          └──────────────────────┘
```

- **Host-Authoritative Model**: The host maintains the canonical game state and runs all rule validations (`validator.ts`, `reducer.ts`, `scoring.ts`).
- **P2P Mesh via WebRTC**: Player actions (`DRAW`, `SWEEP`, `MELD`, `DISCARD`) are dispatched over WebRTC DataChannels to the host, which broadcasts validated state snapshots.

---

## 📁 Project Structure

```text
borako/
├── README.md                      # Complete project documentation & rulebook
├── rules_en.md                    # Detailed English rules reference
├── rules_ar.md                    # Detailed Arabic rules reference (قوانين اللعبة)
├── tech stack.md                  # Tech stack notes & recommendations
├── Playing Cards/                 # Card assets & vector graphics
└── borako-app/                    # React 19 + TypeScript + Vite Application
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── App.tsx                # Main entry & room lobby
        ├── components/
        │   ├── game/
        │   │   ├── Card.tsx       # Interactive card component with animations
        │   │   └── GameBoard.tsx  # Interactive table, hands, piles & scoreboards
        │   └── ui/                # Buttons, dialogs, badges, and modals
        ├── engine/
        │   ├── deck.ts            # 106-card deck generator & shuffler
        │   ├── reducer.ts         # Core state reducer & action dispatcher
        │   ├── scoring.ts         # Borako scoring calculator
        │   ├── validator.ts       # Runs, sets, wilds & sweep validator
        │   └── types.ts           # Game state & card TypeScript interfaces
        ├── hooks/                 # Custom React hooks (game loop, audio, storage)
        └── network/
            └── connection.ts      # WebRTC PeerJS connection manager
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18.0 or higher recommended)
- `npm` or `pnpm` or `yarn`

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/AmmarAlasad/borako.git
   cd borako/borako-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```

4. Open your browser at `http://localhost:5173`.

### Testing Multiplayer Locally
To test a 4-player game on one machine:
1. Open `http://localhost:5173` in a browser window and click **Create Room (Host)**.
2. Note the generated **Room Code**.
3. Open 3 additional private / incognito tabs (or different browsers).
4. Enter your player name, the Room Code, and click **Join Room**.
5. Once all 4 players are connected, the host starts the game!

---

## 🧪 Running Tests & Quality Checks

```bash
# Run linting
npm run lint

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
