import { useState } from 'react';
import { useGame } from '../../hooks/useGame';
import { Card } from './Card';
import { AnimatePresence, Reorder } from 'framer-motion';

export function GameBoard() {
    const { state, actions, peerId } = useGame();
    const [selectedCards, setSelectedCards] = useState<string[]>([]);
    const [selectedMeldId, setSelectedMeldId] = useState<string | null>(null);

    const [playerName, setPlayerName] = useState('');
    const [joinHostId, setJoinHostId] = useState('');
    const [view, setView] = useState<'WELCOME' | 'JOIN'>('WELCOME');
    const [isLoading, setIsLoading] = useState(false);

    const handleHost = async () => {
        setIsLoading(true);
        try {
            await actions.initGame(playerName);
        } catch (e) {
            console.error(e);
            setIsLoading(false);
        }
    };

    const handleJoin = async () => {
        setIsLoading(true);
        try {
            await actions.joinGame(joinHostId, playerName);
        } catch (e) {
            console.error(e);
            alert("Failed to join game. Check Host ID.");
            setIsLoading(false);
        }
    };

    // 1. Welcome Screen (No Players)
    if (state.phase === 'LOBBY' && state.players.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-900/40 via-slate-950 to-slate-950" />

                <div className="z-10 bg-slate-900/80 p-8 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-md max-w-md w-full">
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent mb-2 text-center">Borako</h1>
                    <p className="text-blue-200 text-center mb-8">The Ultimate P2P Card Game</p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Your Name</label>
                            <input
                                className="w-full bg-slate-800 border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-yellow-500 outline-none transition-all"
                                placeholder="Enter your name..."
                                value={playerName}
                                onChange={e => setPlayerName(e.target.value)}
                            />
                        </div>

                        {view === 'WELCOME' ? (
                            <div className="flex flex-col gap-3 pt-2">
                                <button
                                    disabled={!playerName.trim() || isLoading}
                                    className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-bold py-3 rounded-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                                    onClick={handleHost}
                                >
                                    {isLoading ? (
                                        <span className="animate-spin mr-2">⟳</span>
                                    ) : null}
                                    {isLoading ? 'Creating Lobby...' : 'Host New Game'}
                                </button>
                                <button
                                    onClick={() => setView('JOIN')}
                                    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-lg border border-slate-700 transition-all"
                                >
                                    Join Existing Game
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4 pt-2">
                                <div>
                                    <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Host ID</label>
                                    <input
                                        className="w-full bg-slate-800 border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                                        placeholder="Paste Host ID here..."
                                        value={joinHostId}
                                        onChange={e => setJoinHostId(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setView('WELCOME')}
                                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-lg transition-all"
                                    >
                                        Back
                                    </button>
                                    <button
                                        disabled={!playerName.trim() || !joinHostId.trim() || isLoading}
                                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex justify-center items-center"
                                        onClick={handleJoin}
                                    >
                                        {isLoading ? <span className="animate-spin mr-2">⟳</span> : null}
                                        {isLoading ? 'Joining...' : 'Join'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="text-xs text-slate-600 absolute bottom-4">v1.0.0 • PeerJS Powered</div>
            </div>
        );
    }

    // 2. Lobby Screen (Waiting for Players)
    if (state.phase === 'LOBBY') {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white relative">
                <div className="w-full max-w-4xl p-8">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-4xl font-bold text-white">Lobby</h1>
                            <p className="text-slate-400">Waiting for players to join...</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs uppercase text-slate-500 font-bold">Room Code (Click to Copy)</p>
                            <button
                                className="text-xl font-mono text-yellow-400 hover:text-yellow-300 bg-black/30 px-3 py-1 rounded cursor-pointer transition-colors"
                                onClick={() => {
                                    if (peerId) {
                                        navigator.clipboard.writeText(peerId);
                                    }
                                }}
                            >
                                {peerId || 'Generating...'}
                            </button>
                            {!peerId && (
                                <div className="text-xs text-yellow-500 mt-2 text-right">Connecting to Multiplayer Server...</div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                        {[0, 1, 2, 3].map(i => {
                            const player = state.players[i];
                            return (
                                <div key={i} className={`h-40 rounded-xl border-2 flex flex-col items-center justify-center p-4 transition-all ${player ? 'bg-slate-800 border-green-500 shadow-lg shadow-green-900/20' : 'bg-slate-900/50 border-slate-800 border-dashed'}`}>
                                    {player ? (
                                        <>
                                            <div className="w-16 h-16 bg-slate-700 rounded-full mb-3 flex items-center justify-center text-2xl">
                                                {player.name[0]?.toUpperCase()}
                                            </div>
                                            <div className="font-bold text-lg">{player.name}</div>
                                            <div className="text-xs text-green-400">{player.isHost ? 'HOST' : 'READY'}</div>
                                        </>
                                    ) : (
                                        <div className="text-slate-600">Empty Slot</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex justify-center gap-4">
                        <button
                            className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-xl font-bold transition-all border border-slate-700"
                            onClick={() => actions.addBot(`Bot ${state.players.length + 1}`)}
                        >
                            + Add Bot
                        </button>
                        <button
                            disabled={state.players.length < 1}
                            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white px-12 py-4 rounded-xl font-bold text-xl shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
                            onClick={() => actions.startGame()}
                        >
                            START GAME
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const currentPlayer = state.players.find(p => p.id === state.currentTurnPlayerId);
    const myPlayer = state.players.find(p => p.id === peerId);
    const opponents = state.players.filter(p => p.id !== peerId);
    const isMyTurn = state.currentTurnPlayerId === peerId;
    const handCards = myPlayer?.hand || [];

    const toggleSelect = (cardId: string) => {
        setSelectedCards(prev =>
            prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
        );
    };

    const toggleMeldSelect = (meldId: string) => {
        setSelectedMeldId(prev => (prev === meldId ? null : meldId));
    };

    return (
        <div className="flex flex-col h-screen bg-green-800 text-white overflow-hidden relative font-sans">
            {/* HUD - Top Bar */}
            <div className="h-16 shrink-0 bg-black/30 backdrop-blur-sm flex justify-between items-center px-6 border-b border-white/10 z-50">
                <div>
                    <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-yellow-600">Round {state.roundNumber}</h2>
                    <div className="flex gap-4 text-xs font-mono opacity-80">
                        <span>A: {state.teams.A.roundScore}</span>
                        <span>B: {state.teams.B.roundScore}</span>
                    </div>
                </div>

                <div className="flex flex-col items-center">
                    <div className="text-2xl font-bold text-yellow-300 drop-shadow-md">
                        {isMyTurn ? "YOUR TURN" : (currentPlayer ? `${currentPlayer.name}'s Turn` : "Waiting...")}
                    </div>
                    <span className="text-xs uppercase tracking-widest text-white/50">
                        {state.turnPhase === 'WAITING_FOR_DRAW' ? "Draw or Sweep" : "Meld or Discard"}
                    </span>
                </div>

                <div className="text-right text-xs space-y-1">
                    <div className={state.teams.A.hasTakenMour ? "text-red-400" : "text-green-400"}>
                        Mour A: {state.teams.A.hasTakenMour ? "TAKEN" : "READY"}
                    </div>
                    <div className={state.teams.B.hasTakenMour ? "text-red-400" : "text-green-400"}>
                        Mour B: {state.teams.B.hasTakenMour ? "TAKEN" : "READY"}
                    </div>
                </div>
            </div>

            {/* Main Game Area container - Flex Col */}
            <div className="flex-1 flex flex-col min-h-0 relative w-full max-w-[1920px] mx-auto">

                {/* Opponent Areas - Top Ribbon */}
                {opponents.length > 0 && (
                    <div className="shrink-0 py-4 flex justify-center gap-8 relative z-40 bg-gradient-to-b from-black/20 to-transparent">
                        {opponents.map(opp => (
                            <div key={opp.id} className="flex flex-col items-center group">
                                <div className={`relative px-4 py-2 rounded-xl backdrop-blur-md border border-white/10 transition-all ${opp.id === state.currentTurnPlayerId ? 'bg-yellow-500/10 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-black/40'}`}>
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold ring-2 ring-white/10">
                                            {opp.name[0]}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`font-bold text-sm leading-none ${opp.id === state.currentTurnPlayerId ? 'text-yellow-400' : 'text-white'}`}>
                                                {opp.name} {opp.isHost && '👑'}
                                            </span>
                                            <span className="text-[10px] text-zinc-400 font-mono mt-1">
                                                {opp.hand.length} Cards
                                            </span>
                                        </div>
                                    </div>
                                    {/* Small Card Fan */}
                                    <div className="flex -space-x-2 h-8 justify-center mt-1">
                                        {Array.from({ length: Math.min(opp.hand.length, 10) }).map((_, i) => (
                                            <div key={i} className="w-5 h-8 bg-blue-900 rounded border border-white/20 shadow-sm" style={{ transform: `rotate(${(i - 5) * 3}deg)` }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Center Table - Responsive & Flexible */}
                <div className="flex-1 w-full flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-8 p-4 overflow-hidden">

                    {/* Deck & Discard Area */}
                    <div className="flex shrink-0 gap-6 items-center justify-center lg:flex-col lg:justify-start">
                        {/* Deck */}
                        <div
                            className="w-28 h-40 lg:w-40 lg:h-56 bg-blue-900 rounded-xl border-2 border-white/20 shadow-xl flex items-center justify-center cursor-pointer hover:scale-105 transition-transform relative"
                            onClick={() => isMyTurn && state.turnPhase === 'WAITING_FOR_DRAW' && peerId && actions.drawCard(peerId)}
                        >
                            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,#1e3a8a_0px,#1e3a8a_10px,#172554_10px,#172554_20px)] opacity-50 rounded-xl" />
                            <div className="text-center z-10 relative">
                                <div className="font-bold text-xl lg:text-3xl font-serif text-blue-100">Deck</div>
                                <div className="text-sm font-mono text-blue-300 mt-1">{state.deck.length}</div>
                            </div>
                        </div>

                        {/* Discard Pile */}
                        <div className="relative group perspective-1000 z-30">
                            <div
                                className="w-32 h-44 lg:w-44 lg:h-60 border-2 border-dashed border-white/20 rounded-xl flex items-center justify-center relative cursor-pointer bg-white/5 transition-all group-hover:border-yellow-400/50 group-hover:scale-105"
                                onClick={() => {
                                    if (isMyTurn && state.turnPhase === 'WAITING_FOR_DRAW' && peerId) {
                                        actions.sweepPile(peerId);
                                    }
                                }}
                            >
                                {state.discardPile.length > 0 ? (
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        {state.discardPile.slice(Math.max(0, state.discardPile.length - 6), state.discardPile.length - 1).map((card, i) => (
                                            <div
                                                key={card.id}
                                                className="absolute shadow-md rounded-lg overflow-hidden"
                                                style={{
                                                    transform: `rotate(${(i - 2) * 8}deg) translate(${(i - 2) * 2}px, ${(i - 2) * 2}px)`,
                                                    zIndex: i
                                                }}
                                            >
                                                <Card card={card} className="w-20 h-32 lg:w-28 lg:h-40 grayscale-[20%] brightness-90" />
                                            </div>
                                        ))}
                                        <div className="absolute z-20 shadow-2xl transition-transform duration-300 md:group-hover:-translate-y-12">
                                            <Card card={state.discardPile[state.discardPile.length - 1]} className="w-24 h-36 lg:w-32 lg:h-48 ring-1 ring-black/50" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <span className="text-3xl opacity-20">🗑️</span>
                                        <span className="text-white/30 text-[10px] mt-2 font-bold uppercase tracking-widest">Discard</span>
                                    </div>
                                )}
                                <div className="absolute -top-3 -right-3 w-8 h-8 lg:w-10 lg:h-10 bg-yellow-500 rounded-full flex items-center justify-center font-bold text-black border-4 border-slate-900 z-40 shadow-lg text-sm lg:text-base">
                                    {state.discardPile.length}
                                </div>
                            </div>

                            {/* Hover Expansion */}
                            {state.discardPile.length > 0 && (
                                <div className="absolute top-0 left-full ml-6 w-[350px] lg:w-[450px] bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 hidden group-hover:flex flex-col shadow-2xl z-50 animate-in fade-in slide-in-from-left-4 duration-200">
                                    <div className="flex justify-between items-center mb-3 border-b border-white/10 pb-2">
                                        <h4 className="text-yellow-400 font-bold uppercase text-xs tracking-wider">Discard Pile ({state.discardPile.length})</h4>
                                        <span className="text-[10px] text-white/40">Latest on top</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2 justify-start overflow-y-auto max-h-[300px] lg:max-h-[400px] w-full px-1 custom-scrollbar content-start">
                                        {[...state.discardPile].reverse().map((card) => (
                                            <div key={card.id} className="relative transition-all hover:z-10 hover:scale-110 duration-200 cursor-help" title={`${card.rank} of ${card.suit}`}>
                                                <Card card={card} className="w-12 h-16 lg:w-16 lg:h-24 text-[10px] shadow-md hover:shadow-yellow-500/20" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="absolute top-20 -left-2 w-4 h-4 bg-slate-900/95 border-l border-b border-white/10 rotate-45 transform"></div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Melds Area - Flexing properly */}
                    <div className="flex-1 w-full h-full min-h-0 flex gap-4 lg:gap-8 justify-center overflow-hidden pb-2">
                        {/* Team A */}
                        <div className="flex-1 flex flex-col bg-slate-900/40 rounded-2xl border border-blue-500/20 overflow-hidden shadow-inner backdrop-blur-sm">
                            <div className="h-10 lg:h-12 bg-blue-900/30 flex items-center justify-between px-4 border-b border-blue-500/20">
                                <span className="text-sm font-bold text-blue-200 tracking-wider">TEAM A</span>
                                <span className="text-xl lg:text-2xl font-bold text-blue-400 font-mono">{state.teams.A.roundScore}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 lg:p-4 space-y-3 custom-scrollbar">
                                {state.teams.A.melds.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center opacity-20">
                                        <div className="w-16 h-24 border-2 border-dashed border-white rounded mb-2"></div>
                                        <span className="text-xs font-bold">No Melds</span>
                                    </div>
                                )}
                                {state.teams.A.melds.map(meld => (
                                    <div
                                        key={meld.id}
                                        onClick={() => isMyTurn && myPlayer?.teamId === 'A' && toggleMeldSelect(meld.id)}
                                        className={`
                                        group relative p-3 rounded-xl border-2 transition-all cursor-pointer bg-slate-950/30
                                        ${selectedMeldId === meld.id
                                                ? 'border-yellow-400 ring-1 ring-yellow-400/50 bg-blue-900/20'
                                                : 'border-white/5 hover:border-blue-500/30 hover:bg-slate-900/60'
                                            }
                                    `}
                                    >
                                        <div className="flex items-center justify-between mb-2 px-1">
                                            <div className="flex gap-2">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${meld.clean ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-slate-700/50 text-slate-400 border border-white/10'}`}>
                                                    {meld.type} {meld.clean ? 'CLEAN' : ''}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-white/20 font-mono">#{meld.cards.length}</span>
                                        </div>
                                        <div className="flex justify-center -space-x-8 lg:-space-x-10 px-4 pb-2">
                                            {meld.cards.map((c, idx) => (
                                                <div
                                                    key={c.id}
                                                    className="relative transition-transform duration-200 group-hover:-translate-y-2 group-hover:scale-105"
                                                    style={{ zIndex: idx }}
                                                >
                                                    <Card card={c} className="w-16 h-24 lg:w-20 lg:h-32 shadow-lg ring-1 ring-black/30" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Team B */}
                        <div className="flex-1 flex flex-col bg-slate-900/40 rounded-2xl border border-red-500/20 overflow-hidden shadow-inner backdrop-blur-sm">
                            <div className="h-10 lg:h-12 bg-red-900/30 flex items-center justify-between px-4 border-b border-red-500/20">
                                <span className="text-sm font-bold text-red-200 tracking-wider">TEAM B</span>
                                <span className="text-xl lg:text-2xl font-bold text-red-400 font-mono">{state.teams.B.roundScore}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 lg:p-4 space-y-3 custom-scrollbar">
                                {state.teams.B.melds.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center opacity-20">
                                        <div className="w-16 h-24 border-2 border-dashed border-white rounded mb-2"></div>
                                        <span className="text-xs font-bold">No Melds</span>
                                    </div>
                                )}
                                {state.teams.B.melds.map(meld => (
                                    <div
                                        key={meld.id}
                                        onClick={() => isMyTurn && myPlayer?.teamId === 'B' && toggleMeldSelect(meld.id)}
                                        className={`
                                        group relative p-3 rounded-xl border-2 transition-all cursor-pointer bg-slate-950/30
                                        ${selectedMeldId === meld.id
                                                ? 'border-yellow-400 ring-1 ring-yellow-400/50 bg-red-900/20'
                                                : 'border-white/5 hover:border-red-500/30 hover:bg-slate-900/60'
                                            }
                                    `}
                                    >
                                        <div className="flex items-center justify-between mb-2 px-1">
                                            <div className="flex gap-2">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${meld.clean ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-slate-700/50 text-slate-400 border border-white/10'}`}>
                                                    {meld.type} {meld.clean ? 'CLEAN' : ''}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-white/20 font-mono">#{meld.cards.length}</span>
                                        </div>
                                        <div className="flex justify-center -space-x-8 lg:-space-x-10 px-4 pb-2">
                                            {meld.cards.map((c, idx) => (
                                                <div
                                                    key={c.id}
                                                    className="relative transition-transform duration-200 group-hover:-translate-y-2 group-hover:scale-105"
                                                    style={{ zIndex: idx }}
                                                >
                                                    <Card card={c} className="w-16 h-24 lg:w-20 lg:h-32 shadow-lg ring-1 ring-black/30" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Bar & Hand remains fixed at bottom, but now cleaner */}
            {myPlayer && (
                <div className="h-16 bg-black/60 flex items-center justify-center gap-4 relative z-20">
                    <button
                        disabled={!isMyTurn || selectedCards.length === 0}
                        className="px-6 py-2 bg-yellow-600 rounded disabled:opacity-50 font-bold shadow-lg hover:scale-105 transition-all text-sm"
                        onClick={() => {
                            const cards = handCards.filter(c => selectedCards.includes(c.id));
                            if (peerId) actions.meldCards(peerId, cards);
                            setSelectedCards([]);
                            setSelectedMeldId(null);
                        }}
                    >
                        MELD ({selectedCards.length})
                    </button>

                    <button
                        disabled={!isMyTurn || selectedCards.length !== 1}
                        className="px-6 py-2 bg-red-600 rounded disabled:opacity-50 font-bold shadow-lg hover:scale-105 transition-all text-sm"
                        onClick={() => {
                            if (selectedCards.length === 1 && peerId) {
                                actions.discardCard(peerId, selectedCards[0]);
                                setSelectedCards([]);
                                setSelectedMeldId(null);
                            }
                        }}
                    >
                        DISCARD
                    </button>

                    <button
                        disabled={!isMyTurn || selectedCards.length === 0 || !selectedMeldId}
                        className="px-6 py-2 bg-blue-600 rounded disabled:opacity-50 font-bold shadow-lg hover:scale-105 transition-all text-sm flex flex-col items-center leading-tight"
                        onClick={() => {
                            if (!peerId || !selectedMeldId) return;
                            const cards = handCards.filter(c => selectedCards.includes(c.id));

                            actions.addToMeld(peerId, selectedMeldId, cards);

                            setSelectedCards([]);
                            setSelectedMeldId(null);
                        }}
                    >
                        <span>ADD TO MELD</span>
                        {!selectedMeldId && selectedCards.length > 0 && <span className="text-[9px] font-normal opacity-75">(Select a meld)</span>}
                    </button>
                </div>
            )}

            {/* Player Hand */}
            <div className="h-64 bg-black/80 p-4 flex items-end justify-center overflow-x-auto relative z-10">
                {!myPlayer && (
                    <div className="text-white/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        Spectating / Waiting to join...
                    </div>
                )}

                {myPlayer && (
                    <Reorder.Group
                        axis="x"
                        values={handCards}
                        onReorder={(newOrder) => {
                            // Optimistic update handled by Reorder?
                            // No, we need to dispatch.
                            // But Reorder needs local state ideally for smooth drag?
                            // useGame hook drives `handCards` from state.
                            // dispatch sends to host (async).
                            // This might cause jitter.
                            // Ideally we need local state that syncs with remote.
                            // But let's try direct dispatch first.
                            if (peerId) actions.reorderHand(peerId, newOrder);
                        }}
                        className="flex -space-x-12 px-12 pt-8"
                    // Removed hover:space-x-2 for fixed overlap
                    >
                        <AnimatePresence initial={false}>
                            {handCards.map((card) => (
                                <Reorder.Item
                                    key={card.id}
                                    value={card}
                                    initial={{ y: 200, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: 200, opacity: 0 }}
                                    whileDrag={{
                                        scale: 1.1,
                                        zIndex: 100,
                                        boxShadow: "0px 10px 20px rgba(0,0,0,0.5)"
                                    }}
                                    transition={{ duration: 0.2 }}
                                    className="relative transition-transform duration-200"
                                // Removed the hover transform in Card parent?
                                // We need to keep Card generic but remove parent hover.
                                >
                                    <div className="hover:-translate-y-6 transition-transform duration-200">
                                        <Card
                                            card={card}
                                            isSelected={selectedCards.includes(card.id)}
                                            onClick={() => toggleSelect(card.id)}
                                        />
                                    </div>
                                </Reorder.Item>
                            ))}
                        </AnimatePresence>
                    </Reorder.Group>
                )}
            </div>
        </div>
    );
}
