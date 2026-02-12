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

export function calculateTeamAdjustedMeldBonus(targetMeld: Meld, teamMelds: Meld[]): number {
    const bonuses = teamMelds.map(calculateMeldBonus);
    const hasTwoHundredOrMore = bonuses.some(b => b >= 200);
    const targetBonus = calculateMeldBonus(targetMeld);

    if (targetBonus === 100 && !hasTwoHundredOrMore) return 0;
    return targetBonus;
}

export function calculateDisplayedMeldValue(targetMeld: Meld, teamMelds: Meld[]): number {
    const adjustedBonus = calculateTeamAdjustedMeldBonus(targetMeld, teamMelds) / 10;
    const cardValueSum = targetMeld.cards.reduce((sum, c) => sum + c.value, 0);
    // UI currently expects a compact integer badge value.
    return Math.round(adjustedBonus + cardValueSum);
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

    const baseMeldBonuses = melds.map(calculateMeldBonus);
    const hasTwoHundredOrMore = baseMeldBonuses.some(b => b >= 200);
    const effectiveMeldBonuses = baseMeldBonuses.map(b => (b === 100 && !hasTwoHundredOrMore ? 0 : b));
    meldPoints = effectiveMeldBonuses.reduce((sum, b) => sum + b, 0);

    melds.forEach(m => {
        m.cards.forEach(c => meldCardValues += c.value);
    });

    handCards.forEach(c => handPenalty += c.value);

    // Mour penalty is 10 final points if Mour was never taken.
    const mourPenalty = !hasTakenMour ? 10 : 0;

    // Preserve existing go-out bonus, but in final-point space.
    const goOutBonus = didGoOut ? 10 : 0;

    // Only meld bonuses are divided by 10; card values already use final-point scale.
    const meldPointsDivided = meldPoints / 10;
    const finalScore = (meldPointsDivided + meldCardValues + goOutBonus) - (handPenalty + mourPenalty);

    return {
        totalPoints: finalScore,
        breakDown: {
            meldPoints,
            meldPointsDivided,
            meldCardValues,
            handPenalty,
            mourPenalty,
            goOutBonus,
            effectiveMeldBonuses
        }
    };
}
