import type { Card, Rank, Suit } from './types';
import { v4 as uuidv4 } from 'uuid';

const SUITS: Suit[] = ['CLUBS', 'DIAMONDS', 'SPADES', 'HEARTS'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const CARD_VALUES: Record<Rank, number> = {
    'A': 1.5,
    '2': 1,
    '3': 0.5,
    '4': 0.5,
    '5': 0.5,
    '6': 0.5,
    '7': 0.5,
    '8': 1,
    '9': 1,
    '10': 1,
    'J': 1,
    'Q': 1,
    'K': 1,
};

// Returns a single deck of 52 cards
function createSingleDeck(deckIndex: number): Card[] {
    const cards: Card[] = [];

    SUITS.forEach(suit => {
        RANKS.forEach(rank => {
            cards.push({
                id: `${suit}-${rank}-${deckIndex}`, // Consistent ID for assets, but maybe uuid is safer for duplicate tracking? 
                // Actually, we usually want unique IDs for React keys. 
                // Let's us a deterministic ID for asset mapping, but maybe a wrapper for the entity.
                // For simplicity, let's use a unique string.
                // id: uuidv4(), // Removed duplicate
                suit,
                rank,
                value: CARD_VALUES[rank]
            });
        });
    });

    return cards;
}

export function createGameDeck(): Card[] {
    // 2 Standard Decks
    let deck = [
        ...createSingleDeck(0),
        ...createSingleDeck(1)
    ];

    // 2 Devil Jokers
    // We'll treat them as a special Suit/Rank or just flag them?
    // Rules say they exist distinct from 2s.
    // Let's give them a special Rank 'JOKER' or just use a flag.
    // Our types used `isDevilJoker` flag.
    // We need to give them a suit/rank for type safety? Or make suit/rank optional?
    // Let's make them 'HEARTS' '2' effectively but with a flag? No, that's confusing.
    // Let's assume they are "Colorless" or special. 
    // For types.ts, Suit is required. Let's strictly follow the types.
    // The rules say "Devil Joker". 
    // Let's assign them a dummy suit/rank but rely on `isDevilJoker` flag.
    // Or better, update types to allow null suit/rank? 
    // No, strict types are better. Let's assign 'SPADES' and 'HEARTS' purely for visual if needed, 
    // but logically they are wild.
    // Actually, standard Jokers usually have Color (Red/Black). 
    // Let's just create them.

    const joker1: Card = {
        id: uuidv4(),
        suit: 'HEARTS', // Arbitrary
        rank: '2', // Arbitrary, but visually distinct
        isDevilJoker: true,
        value: 1
    };

    const joker2: Card = {
        id: uuidv4(),
        suit: 'SPADES', // Arbitrary
        rank: '2', // Arbitrary
        isDevilJoker: true,
        value: 1
    };

    deck.push(joker1, joker2);

    return shuffle(deck);
}

export function shuffle(cards: Card[]): Card[] {
    const newCards = [...cards];
    for (let i = newCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newCards[i], newCards[j]] = [newCards[j], newCards[i]];
    }
    return newCards;
}

export function sortHand(cards: Card[]): Card[] {
    return [...cards].sort((a, b) => {
        if (a.suit !== b.suit) {
            const suitOrder = { 'CLUBS': 0, 'DIAMONDS': 1, 'SPADES': 2, 'HEARTS': 3 };
            return suitOrder[a.suit] - suitOrder[b.suit];
        }
        return b.value - a.value; // Rank Sort
    });
}
