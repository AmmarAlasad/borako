import type { Meld, Card } from './types';

export function calculateMeldBonus(meld: Meld): number {
    if (meld.cards.length < 7) return 0;

    const { type, rank, clean, wildCount = 0 } = meld;

    if (type === 'RUN') {
        if (clean) return 200;
        if (wildCount === 1) return 100;
        return 0; // 2+ wilds get no bonus
    }

    if (type === 'SET') {
        // Sets are only allowed for A, 2, 3
        if (rank === '3' || rank === 'A') {
            if (clean) return 300;
            if (wildCount === 1) return 150;
            return 0;
        }

        if (rank === '2') {
            if (clean) return 400;
            if (wildCount === 1) return 200;
            return 0;
        }
    }

    return 0;
}

export function calculateTeamRoundScore(
    melds: Meld[],
    handCards: Card[], // Cards remaining in hands of team players
    hasTakenMour: boolean,
    didGoOut: boolean
): { totalPoints: number; breakDown: any } {
    let meldPoints = 0;
    let meldCardValues = 0;
    let handPenalty = 0;

    // 1. Meld Bonuses
    melds.forEach(m => {
        meldPoints += calculateMeldBonus(m);
        // 2. Cards inside Melds
        m.cards.forEach(c => meldCardValues += c.value);
    });

    // 3. Hand Penalty
    handCards.forEach(c => handPenalty += c.value);

    // 4. Mour Penalty
    const mourPenalty = !hasTakenMour ? 100 : 0;

    // 5. Going Out Bonus
    const goOutBonus = didGoOut ? 100 : 0;

    const rawScore = (meldPoints + meldCardValues + goOutBonus) - (handPenalty + mourPenalty);

    // Divide by 10 (Borako Rule)
    const finalScore = rawScore / 10;

    return {
        totalPoints: finalScore,
        breakDown: {
            meldPoints,
            meldCardValues,
            handPenalty,
            mourPenalty,
            goOutBonus,
            rawScore
        }
    };
}
