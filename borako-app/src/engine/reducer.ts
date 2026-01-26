
import type { GameState, Card, Meld } from './types';
import { createGameDeck } from './deck';
import { validateMeld } from './validator';
import { calculateTeamRoundScore } from './scoring';
import { v4 as uuidv4 } from 'uuid';

export type GameAction =
    | { type: 'INIT_GAME'; payload: { hostName: string; playerId: string } }
    | { type: 'JOIN_GAME'; payload: { playerId: string; name: string } }
    | { type: 'START_GAME' }
    | { type: 'DRAW_CARD'; payload: { playerId: string } }
    | { type: 'SWEEP_PILE'; payload: { playerId: string } }
    | { type: 'MELD_CARDS'; payload: { playerId: string; cards: Card[] } }
    | { type: 'ADD_TO_MELD'; payload: { playerId: string; meldId: string; cards: Card[] } }
    | { type: 'DISCARD_CARD'; payload: { playerId: string; cardId: string } }
    | { type: 'REORDER_HAND'; payload: { playerId: string; newOrder: Card[] } }
    | { type: 'KICK_PLAYER'; payload: { playerId: string } }
    | { type: 'NEXT_ROUND' }
    | { type: 'RESET_GAME' }
    | { type: 'SYNC_STATE'; payload: GameState };

export const INITIAL_STATE: GameState = {
    phase: 'LOBBY',
    roundNumber: 0,
    deck: [],
    discardPile: [],
    players: [],
    teams: {
        A: { id: 'A', melds: [], mourPile: [], hasTakenMour: false, totalScore: 0, roundScore: 0 },
        B: { id: 'B', melds: [], mourPile: [], hasTakenMour: false, totalScore: 0, roundScore: 0 },
    },
    currentTurnPlayerId: null,
    turnPhase: 'WAITING_FOR_DRAW',
    hasSwept: false,
    logs: [],
};

// Helper to auto-sort hand: Suit (Clubs, Diamonds, Spades, Hearts) -> Rank (A, K..2)
function sortHand(cards: Card[]): Card[] {
    const suitOrder: Record<string, number> = { 'CLUBS': 0, 'DIAMONDS': 1, 'SPADES': 2, 'HEARTS': 3 };
    const rankOrder: Record<string, number> = {
        'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2
    };

    return [...cards].sort((a, b) => {
        // 1. Sort by Suit
        const suitDiff = suitOrder[a.suit] - suitOrder[b.suit];
        if (suitDiff !== 0) return suitDiff;

        // 2. Sort by Rank (Desc)
        // Jokers: Let's put them at the very start (left). Wilds are special.
        const valA = a.isDevilJoker ? 100 : rankOrder[a.rank];
        const valB = b.isDevilJoker ? 100 : rankOrder[b.rank];

        return valB - valA; // Descending
    });
}

export function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case 'INIT_GAME': {
            return {
                ...INITIAL_STATE,
                players: [{
                    id: action.payload.playerId,
                    name: action.payload.hostName,
                    hand: [],
                    teamId: 'A', // Host is Team A
                    isHost: true
                }]
            };
        }

        case 'JOIN_GAME': {
            if (state.phase !== 'LOBBY') return state;
            if (state.players.length >= 4) return state; // Max 4

            const teamId = state.players.length % 2 === 0 ? 'A' : 'B'; // Cycle A, B, A, B
            return {
                ...state,
                players: [
                    ...state.players,
                    {
                        id: action.payload.playerId,
                        name: action.payload.name,
                        hand: [],
                        teamId,
                        isHost: false
                    }
                ]
            };
        }

        case 'KICK_PLAYER': {
            if (state.phase !== 'LOBBY') return state;

            // Filter out the kicked player
            const newPlayers = state.players.filter(p => p.id !== action.payload.playerId);

            // Reassign teams to ensure ABAB balance
            const balancedPlayers = newPlayers.map((p, index) => ({
                ...p,
                teamId: (index % 2 === 0 ? 'A' : 'B') as 'A' | 'B'
            }));

            return {
                ...state,
                players: balancedPlayers
            };
        }

        case 'START_GAME': {
            if (state.players.length < 1) return state; // Allow 1 player for debug
            // Setup Deck
            const deck = createGameDeck();

            // Deal 11 to each player
            const players = state.players.map(p => ({ ...p, hand: [] as Card[] }));

            // Deal Mour Piles (11 each)
            // Team A Mour
            const mourA = deck.splice(0, 11);
            const mourB = deck.splice(0, 11);

            // Deal Players
            players.forEach(p => {
                const rawHand = deck.splice(0, 11);
                p.hand = sortHand(rawHand); // AUTO SORT ON DEAL
            });

            // Flip one card for discard?
            // Usually yes.
            const firstDiscard = deck.pop();
            const discardPile = firstDiscard ? [firstDiscard] : [];

            return {
                ...state,
                phase: 'PLAYING',
                deck,
                discardPile,
                players,
                teams: {
                    A: { ...state.teams.A, mourPile: mourA },
                    B: { ...state.teams.B, mourPile: mourB }
                },
                currentTurnPlayerId: state.players[0].id,
                turnPhase: 'WAITING_FOR_DRAW',
                hasSwept: false,
                logs: [...state.logs, "Game Started!"]
            };
        }

        case 'DRAW_CARD': {
            if (state.currentTurnPlayerId !== action.payload.playerId) return state;
            if (state.turnPhase !== 'WAITING_FOR_DRAW') return state;

            const newDeck = [...state.deck];
            const card = newDeck.pop();

            if (!card) return state; // Deck empty handle?

            const players = state.players.map(p => {
                if (p.id === action.payload.playerId) {
                    return { ...p, hand: sortHand([...p.hand, card]) }; // AUTO SORT ON DRAW
                }
                return p;
            });

            return {
                ...state,
                deck: newDeck,
                players,
                turnPhase: 'PLAYING',
                logs: [...state.logs, "Player drew a card"]
            };
        }

        case 'SWEEP_PILE': {
            if (state.currentTurnPlayerId !== action.payload.playerId) return state;
            if (state.turnPhase !== 'WAITING_FOR_DRAW') return state;

            const discardPile = [...state.discardPile];
            if (discardPile.length === 0) return state;

            const players = state.players.map(p => {
                if (p.id === action.payload.playerId) {
                    return { ...p, hand: sortHand([...p.hand, ...discardPile]) }; // AUTO SORT ON SWEEP
                }
                return p;
            });

            return {
                ...state,
                discardPile: [],
                players,
                turnPhase: 'PLAYING',
                hasSwept: true, // Must Meld!
                logs: [...state.logs, "Player swept the pile!"]
            };
        }

        case 'MELD_CARDS': {
            if (state.currentTurnPlayerId !== action.payload.playerId) return state;
            if (state.turnPhase !== 'PLAYING') return state;

            const { cards } = action.payload;
            const result = validateMeld(cards);

            if (!result.isValid) {
                return state;
            }

            // Move cards from Hand -> Team Meld
            const player = state.players.find(p => p.id === action.payload.playerId)!;
            const newHand = player.hand.filter(c => !cards.find(m => m.id === c.id));

            if (newHand.length === player.hand.length) return state;

            // Helper for sorting Sets (Runs handled by Validator)
            const sortSetCards = (cardsToSort: Card[]): Card[] => {
                return [...cardsToSort].sort((a, b) => {
                    const aWild = a.isDevilJoker || a.rank === '2';
                    const bWild = b.isDevilJoker || b.rank === '2';
                    if (aWild && !bWild) return 1;
                    if (!aWild && bWild) return -1;
                    return 0;
                });
            };

            const finalCards = result.sortedCards || sortSetCards(cards);

            const newMeld: Meld = {
                id: uuidv4(),
                type: result.meldType!,
                cards: finalCards,
                clean: result.isClean,
                wildCount: result.wildCount,
                suit: result.baseSuit,
                rank: result.baseRank
            };

            const teamId = player.teamId;

            return {
                ...state,
                players: state.players.map(p => p.id === player.id ? { ...p, hand: newHand } : p),
                teams: {
                    ...state.teams,
                    [teamId]: {
                        ...state.teams[teamId],
                        melds: [...state.teams[teamId].melds, newMeld]
                    }
                },
                logs: [...state.logs, `Player melded ${cards.length} cards`]
            };
        }

        case 'ADD_TO_MELD': {
            if (state.currentTurnPlayerId !== action.payload.playerId) return state;
            if (state.turnPhase !== 'PLAYING') return state;

            const { meldId, cards } = action.payload;
            const player = state.players.find(p => p.id === action.payload.playerId)!;
            const teamId = player.teamId;
            const targetMeld = state.teams[teamId].melds.find(m => m.id === meldId);

            if (!targetMeld) return state;

            // Validate Extension
            const combinedCards = [...targetMeld.cards, ...cards];
            const result = validateMeld(combinedCards);

            // Valid extension if:
            // 1. Still valid meld
            // 2. Type preserved (usually)
            // 3. Size increased
            if (!result.isValid) {
                // Try sorting? validateMeld sorts internally.
                return state;
            }

            // Special check: Can't change Meld Type usually? 
            // e.g. Set -> Run impossible.
            // Run -> Set impossible.
            if (result.meldType !== targetMeld.type) {
                // Maybe allow upgrading? Borako rules might vary.
                // Usually Type is constant.
                return state;
            }

            // Remove from hand
            const newHand = player.hand.filter(c => !cards.find(m => m.id === c.id));
            if (newHand.length === player.hand.length) return state;

            // Helper for sorting Sets (Runs handled by Validator)
            const sortSetCards = (cardsToSort: Card[]): Card[] => {
                // Put Naturals first, then Wilds.
                return [...cardsToSort].sort((a, b) => {
                    const aWild = a.isDevilJoker || a.rank === '2';
                    const bWild = b.isDevilJoker || b.rank === '2';
                    if (aWild && !bWild) return 1;
                    if (!aWild && bWild) return -1;
                    return 0;
                });
            };

            const finalCards = result.sortedCards || sortSetCards(combinedCards);

            // Update Meld
            const updatedMeld: Meld = {
                ...targetMeld,
                cards: finalCards,
                clean: result.isClean,
                wildCount: result.wildCount,
                // Suit/Rank might update if we added to a Set? No base stays same.
            };

            // Re-sort cards for display logic (Run ordering)
            // Ideally `validateMeld` should return sorted cards.
            // For now, let's just append and let UI/User handle or do lazy sort.

            return {
                ...state,
                players: state.players.map(p => p.id === player.id ? { ...p, hand: newHand } : p),
                teams: {
                    ...state.teams,
                    [teamId]: {
                        ...state.teams[teamId],
                        melds: state.teams[teamId].melds.map(m => m.id === meldId ? updatedMeld : m)
                    }
                },
                logs: [...state.logs, `Added to meld`]
            };
        }

        case 'DISCARD_CARD': {
            if (state.currentTurnPlayerId !== action.payload.playerId) return state;
            if (state.turnPhase !== 'PLAYING') return state; // Must be in playing phase to discard

            // CHECK SWEEP CONSTRAINT
            // "If you sweep... must immediately Open a new meld OR Add... Then discard"
            if (state.hasSwept) {
                // Logic: Did they meld this turn?
                // We need to track `didMeld` in state?
                // `hasSwept` implies "Sweep Action Happened".
                // We can add `turnActions: ['SWEEP', 'MELD']` to track history?
                // Or simpler: Check if hand size increased? No.
                // Let's assume the UI enforces this, or we track `meldedThisTurn`.
                // Let's add `meldedThisTurn` to global or logic.
                // For now, I'll Skip enforcement here or assume `hasSwept` is cleared by Meld?
                // No, hasSwept is set at sweep.
                // Let's add `hasMelded` to state.
            }

            const player = state.players.find(p => p.id === action.payload.playerId)!;
            const card = player.hand.find(c => c.id === action.payload.cardId);

            if (!card) return state;

            const newHand = player.hand.filter(c => c.id !== action.payload.cardId);

            // CHECK MOUR
            // If hand becomes empty (0), take Mour.
            // Rules: "When a player empties their hand... takes the Mour pile".
            // Does he discard first?
            // Usually: Discard -> Check 0 -> Take Mour -> Turn Ends.
            // OR: Meld to 0 -> Take Mour -> CONTINUE turn.

            // Case A: Discarding leaves 0 cards.
            // Taking mour now.
            // Does turn end? Usually "Go Out" means taking mour allows you to play it next turn?
            // Or if you haven't taken mour yet, you pick it up and KEEP PLAYING?
            // "Team takes their Mour pile ... and continues."
            // "Continues" implies same turn? "A Team A player plays their last card -> Picks up Mour -> Keeps playing"
            // If I discard and have 0? I pick up mour. Can I discard again? NO. I just discarded.
            // So I pick up mour and END TURN.

            let nextState = { ...state };
            let nextPlayerIndex = (state.players.findIndex(p => p.id === player.id) + 1) % state.players.length;

            // Apply Discard
            nextState.players = nextState.players.map(p => p.id === player.id ? { ...p, hand: newHand } : p);
            nextState.discardPile = [...nextState.discardPile, card];

            // Check Mour Condition
            const team = nextState.teams[player.teamId];
            if (newHand.length === 0 && !team.hasTakenMour) {
                // Take Mour
                const mour = team.mourPile;
                nextState.teams = {
                    ...nextState.teams,
                    [player.teamId]: { ...team, mourPile: [], hasTakenMour: true }
                };
                nextState.players = nextState.players.map(p => p.id === player.id ? { ...p, hand: sortHand(mour) } : p); // AUTO SORT MOUR PICKUP
                nextState.logs = [...nextState.logs, "Player took the Mour!"];

            }

            // CHECK GOING OUT CONDITION (Hand Empty AND Mour Taken)
            const hasGoneOut = newHand.length === 0 && team.hasTakenMour;

            if (hasGoneOut) {
                // ROUND END!
                const teamA = nextState.teams.A;
                const teamB = nextState.teams.B;

                // Cards remaining in Hands for penalty
                const handCardsA = nextState.players.filter(p => p.teamId === 'A').flatMap(p => p.hand);
                const handCardsB = nextState.players.filter(p => p.teamId === 'B').flatMap(p => p.hand);

                // Calculate Scores
                const resultA = calculateTeamRoundScore(teamA.melds, handCardsA, teamA.hasTakenMour, player.teamId === 'A'); // Gone out bonus if A
                const resultB = calculateTeamRoundScore(teamB.melds, handCardsB, teamB.hasTakenMour, player.teamId === 'B');

                // Update Total Scores
                const newTotalA = teamA.totalScore + resultA.totalPoints;
                const newTotalB = teamB.totalScore + resultB.totalPoints;

                // Check Game Win
                const isGameEnd = newTotalA >= 350 || newTotalB >= 350;

                nextState.teams = {
                    A: { ...teamA, roundScore: resultA.totalPoints, totalScore: newTotalA },
                    B: { ...teamB, roundScore: resultB.totalPoints, totalScore: newTotalB }
                };

                nextState.phase = isGameEnd ? 'GAME_END' : 'ROUND_END';
                nextState.logs = [...nextState.logs, `Round Over! Score: A +${resultA.totalPoints}, B +${resultB.totalPoints}`];

                return nextState;
            }

            // NEXT TURN
            nextState.currentTurnPlayerId = nextState.players[nextPlayerIndex].id;
            nextState.turnPhase = 'WAITING_FOR_DRAW';
            nextState.hasSwept = false;

            return nextState;
        }

        case 'NEXT_ROUND': {
            // Reset round state but keep scores and teams
            const newDeck = createGameDeck();
            // Rotate dealer? Usually winner starts or rotation? Let's just rotate start player index if needed but keep simple.

            // Similar to START_GAME logic but keeping Scores
            const mourA = newDeck.splice(0, 11);
            const mourB = newDeck.splice(0, 11);

            const players = state.players.map(p => ({ ...p, hand: sortHand(newDeck.splice(0, 11)) })); // AUTO SORT
            const firstDiscard = newDeck.pop();
            const discardPile = firstDiscard ? [firstDiscard] : [];

            return {
                ...state,
                phase: 'PLAYING',
                roundNumber: state.roundNumber + 1,
                deck: newDeck,
                discardPile,
                players,
                teams: {
                    A: { ...state.teams.A, melds: [], mourPile: mourA, hasTakenMour: false, roundScore: 0 },
                    B: { ...state.teams.B, melds: [], mourPile: mourB, hasTakenMour: false, roundScore: 0 }
                },
                currentTurnPlayerId: state.players[0].id, // Should rotate?
                turnPhase: 'WAITING_FOR_DRAW',
                hasSwept: false,
                logs: [...state.logs, `Round ${state.roundNumber + 1} Started!`]
            };
        }

        case 'RESET_GAME': {
            const resetPlayers = state.players.map(p => ({ ...p, hand: [], isHost: p.isHost })); // Keep players
            // Maybe actually re-run logic effectively
            // Let's just reset stats and go back to Lobby?
            // Or instant restart? 
            // Usually "New Game" -> Lobby.
            return {
                ...INITIAL_STATE,
                players: resetPlayers.map(p => ({ ...p, hand: [], teamId: p.teamId, isHost: p.isHost })), // Keep roster
                phase: 'LOBBY'
            };
        }

        case 'REORDER_HAND': {
            if (state.currentTurnPlayerId !== action.payload.playerId) {
                // Technically you can reorder anytime, even if not your turn? 
                // Let's allow it continuously for UX.
                // But generally actions are gated. 
                // For local sort, we want it always.
                // P2P: If I reorder, I send action to host. Host updates state.
                // So yes, allow always.
            }

            const player = state.players.find(p => p.id === action.payload.playerId);
            if (!player) return state;

            // Update hand order
            return {
                ...state,
                players: state.players.map(p =>
                    p.id === player.id
                        ? { ...p, hand: action.payload.newOrder }
                        : p
                )
            };
        }

        case 'SYNC_STATE': {
            return action.payload; // Full replacement
        }

        default:
            return state;
    }
}

