export type Suit = 'CLUBS' | 'DIAMONDS' | 'SPADES' | 'HEARTS';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
    id: string; // Unique ID for React keys
    suit: Suit;
    rank: Rank;
    isDevilJoker?: boolean; // The 2 specific "Devil Jokers"
    value: number; // For point counting (1.5, 1, 0.5, etc)
}

export type MeldType = 'RUN' | 'SET';

export interface Meld {
    id: string;
    type: MeldType;
    cards: Card[];
    // Metadata for validation/scoring
    clean?: boolean; // No wilds
    suit?: Suit; // For runs
    rank?: Rank; // For sets
}

export interface Player {
    id: string;
    name: string;
    hand: Card[];
    teamId: 'A' | 'B';
    isHost: boolean;
}

export interface Team {
    id: 'A' | 'B';
    melds: Meld[];
    mourPile: Card[];
    hasTakenMour: boolean;
    totalScore: number;
    roundScore: number;
}

export type GamePhase = 'LOBBY' | 'PLAYING' | 'ROUND_END' | 'GAME_END';
export type TurnPhase = 'WAITING_FOR_DRAW' | 'PLAYING' | 'DISCARDING';

export interface GameState {
    // Global State
    phase: GamePhase;
    roundNumber: number;

    // Table State
    deck: Card[];
    discardPile: Card[];

    // Entities
    players: Player[];
    teams: {
        A: Team;
        B: Team;
    };

    // Turn Management
    currentTurnPlayerId: string | null;
    turnPhase: TurnPhase;
    hasSwept: boolean; // Track if current player swept (forces meld)

    // Messages/Logs
    logs: string[];
}
