# Borako - Multiplayer Card Game

![Borako Game](https://img.shields.io/badge/Status-Active-green) ![Tech](https://img.shields.io/badge/Tech-React%20%7C%20Vite%20%7C%20PeerJS-blue)

A peer-to-peer multiplayer implementation of the **Borako** card game (team variant), built with **React**, **Vite**, and **PeerJS** for serverless communication.

## 🏗 Architecture

The complete system architecture, including the Game Engine, State Management, and Networking layers, is documented in the PlantUML diagram below.

[**View Architecture Diagram (PUML)**](./borako_architecture.puml)

*You can render this file using any PlantUML viewer or the [PlantUML Text Editor](https://www.planttext.com/).*

---

# 📘 Rules of Borako (English)

## 1. Objective
*   **Players**: 4 players (2 Teams of 2).
*   **Deck**: 2 standard decks + 2 distinct Jokers (106 cards total).
*   **Goal**: First team to reach **350 points** wins.

## 2. Setup
*   **Hand**: 11 cards per player.
*   **Mour**: 11 cards reserved per team (face-down).
*   **Areas**: Draw Pile, Discard Pile, Team Meld Areas.

## 3. Gameplay
On your turn, choose **one**:
1.  **Draw**: Take 1 card from the deck.
2.  **Sweep (Takweesh)**: Take the **entire** discard pile.
    *   *Requirement*: If you sweep, you must immediately **Meld** (open new or add to existing).

**End of Turn**: Discard 1 card.

## 4. Melds
*   **Runs**: 3+ consecutive cards of the same suit (e.g., 5♥ 6♥ 7♥).
*   **Sets**: 3+ cards of same rank (Only **A, 2, 3** allowed).
*   **Wilds**:
    *   **2**: Can be a wild card (substitute) OR a natural 2.
    *   **Joker**: Always wild.

## 5. Scoring
Points are calculated at the end of every round and **divided by 10**.

### Meld Bonuses (for 7+ cards)
| Meld Type | Condition | Bonus |
| :--- | :--- | :--- |
| **Run** | Clean (No Wilds) | **200** |
| **Run** | Dirty (1 Wild) | **100** |
| **Set (A, 3)** | Clean | **300** |
| **Set (A, 3)** | Dirty (1 Wild) | **150** |
| **Set (2s)** | Clean | **400** |
| **Set (2s)** | Dirty (1 Wild) | **200** |

### Special Rules
*   **Going Out**: +100 bonus for emptying hand.
*   **Mour Penalty**: -100 penalty if team never took their Mour pile.
*   **Card Values**: (A=1.5, 2=1, 3-7=0.5, 8-K=1).

---

# 📘 قوانين بوراكو (العربية)

## 1. الهدف
*   **اللاعبون**: 4 لاعبين (فريقان).
*   **الورق**: علبتين كاملتين + جوكرين (106 ورقة).
*   **الفوز**: الوصول إلى **350 نقطة**.

## 2. التوزيع
*   **اليد**: 11 ورقة لكل لاعب.
*   **المور**: 11 ورقة احتياط لكل فريق.

## 3. طريقة اللعب
في دورك، تختار **واحدًا فقط**:
1.  **سحب**: ورقة واحدة من الكومة.
2.  **تكويش**: أخذ كومة الرمي كاملة.
    *   *شرط*: يجب أن تفتح (تنزل) ورق فوراً عند التكويش.

**نهاية الدور**: ارمِ ورقة واحدة.

## 4. الفتحات (Melds)
*   **سلسلة (Run)**: أرقام متتالية من نفس النوع (مثال: 5♥ 6♥ 7♥).
*   **مجموعة (Set)**: نفس الرقم (مسموح فقط لـ **A, 2, 3**).
*   **الجوكر والبديل**:
    *   **رقم 2**: يمكن استخدامه كـ 2 عادي أو كبديل (جوكر).
    *   **الجوكر الأصلي**: دائماً بديل.

## 5. حساب النقاط
تُحسب النقاط وتُقسم على **10**.

### مكافآت الفتحات (7 أوراق أو أكثر)
| نوع الفتحة | الحالة | المكافأة |
| :--- | :--- | :--- |
| **سلسلة** | نظيفة (بدون بديل) | **200** |
| **سلسلة** | وسخة (بديل واحد) | **100** |
| **مجموعة (A, 3)** | نظيفة | **300** |
| **مجموعة (A, 3)** | وسخة (بديل واحد) | **150** |
| **مجموعة (2)** | نظيفة | **400** |
| **مجموعة (2)** | وسخة (بديل واحد) | **200** |

### قواعد خاصة
*   **الخروج (تسكير)**: +100 نقطة إضافية.
*   **عقوبة المور**: -100 نقطة إذا لم يأخذ الفريق المور.
