import type { Card as CardType } from '../../engine/types';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface CardProps {
    card?: CardType; // Make card optional if purely showing a back (though usually we pass it)
    isFaceDown?: boolean;
    isSelected?: boolean;
    onClick?: () => void;
    className?: string;
    style?: React.CSSProperties;
}

export function Card({ card, isFaceDown, isSelected, onClick, className, style }: CardProps) {
    // ... helper ...
    const getRankName = (r: string) => {
        if (r === 'A') return 'ace';
        if (r === 'J') return 'jack';
        if (r === 'Q') return 'queen';
        if (r === 'K') return 'king';
        return r;
    };

    // If face down, render back
    if (isFaceDown) {
        return (
            <motion.div
                layoutId={card?.id ? `back-${card.id}` : undefined}
                className={cn(
                    "relative w-24 h-36 bg-blue-900 rounded-lg shadow-md select-none border-2 border-white/20",
                    className
                )}
                style={{
                    ...style,
                    backgroundImage: 'repeating-linear-gradient(45deg, #1e3a8a 0px, #1e3a8a 10px, #172554 10px, #172554 20px)'
                }}
            >
                <div className="absolute inset-2 border border-white/10 rounded-sm flex items-center justify-center">
                    <span className="text-2xl font-bold text-white/20">B</span>
                </div>
            </motion.div>
        );
    }

    if (!card) return null; // Should not happen if not face down

    const rankName = getRankName(card.rank);
    const suitName = card.suit.toLowerCase();

    // ... existing logic ...
    const fileName = card.isDevilJoker
        ? (card.suit === 'HEARTS' || card.suit === 'DIAMONDS' ? 'red_joker.svg' : 'black_joker.svg')
        : `${rankName}_of_${suitName}${['jack', 'queen', 'king'].includes(rankName) ? '2' : ''}.svg`;

    return (
        <motion.div
            layoutId={card.id}
            className={cn(
                "relative w-24 h-36 bg-white rounded-lg shadow-md select-none cursor-pointer transition-transform hover:scale-105",
                isSelected && "ring-4 ring-blue-500 -translate-y-4 shadow-xl z-10",
                className
            )}
            onClick={onClick}
            style={style}
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.95 }}
        >
            <img
                src={`/cards/${fileName}`}
                alt={`${card.rank} of ${card.suit}`}
                className="w-full h-full object-contain p-1"
                onError={(e) => {
                    e.currentTarget.src = "/vite.svg";
                }}
            />
            {card.isDevilJoker && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {/* Removed Text as requested */}
                </div>
            )}
        </motion.div>
    );
}
