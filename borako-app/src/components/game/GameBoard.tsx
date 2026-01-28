import { useState } from 'react';
import { useGame } from '../../hooks/useGame';
import { Card } from './Card';
import { AnimatePresence, Reorder } from 'framer-motion';
import { calculateMeldBonus } from '../../engine/scoring';

export function GameBoard() {
    const { state, actions, peerId } = useGame();
    const isHost = state.players.find(p => p.id === peerId)?.isHost;
    const [selectedCards, setSelectedCards] = useState<string[]>([]);
    const [selectedMeldId, setSelectedMeldId] = useState<string | null>(null);

    const [playerName, setPlayerName] = useState('');
    const [teamAName, setTeamAName] = useState('Team A'); // New State
    const [teamBName, setTeamBName] = useState('Team B'); // New State
    const [joinHostId, setJoinHostId] = useState('');
    const [view, setView] = useState<'WELCOME' | 'JOIN'>('WELCOME');
    const [isLoading, setIsLoading] = useState(false);

    // Feedback Toast State (Hoisted to top)
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const handleHost = async () => {
        setIsLoading(true);
        try {
            await actions.initGame(playerName, { A: teamAName, B: teamBName });
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

    // 1. GAME END Screen
    if (state.phase === 'GAME_END') {
        const teamAScore = state.teams?.A?.totalScore ?? 0;
        const teamBScore = state.teams?.B?.totalScore ?? 0;
        const winner = teamAScore >= 350 ? 'TEAM A' : 'TEAM B';
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-white relative overflow-hidden z-50">
                <div className="text-center p-12 bg-slate-900 rounded-2xl shadow-2xl border border-yellow-500/30 animate-in zoom-in spin-in-3 duration-500">
                    <div className="text-6xl mb-4">👑</div>
                    <h1 className="text-6xl font-black bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-700 bg-clip-text text-transparent mb-4">
                        {winner} WINS!
                    </h1>
                    <div className="flex justify-center gap-12 text-2xl font-mono mb-8">
                        <div className="flex flex-col items-center">
                            <span className="text-blue-400 font-bold">{state.teams.A.name || 'Team A'}</span>
                            <span className="text-4xl">{teamAScore}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-red-400 font-bold">{state.teams.B.name || 'Team B'}</span>
                            <span className="text-4xl">{teamBScore}</span>
                        </div>
                    </div>
                    {isHost ? (
                        <button
                            onClick={() => actions.resetGame()}
                            className="bg-white text-black font-bold px-8 py-3 rounded hover:scale-105 transition-transform"
                        >
                            Return to Lobby
                        </button>
                    ) : (
                        <div className="text-slate-400 animate-pulse">Waiting for host...</div>
                    )}
                </div>
            </div>
        );
    }

    // 2. ROUND END Screen
    if (state.phase === 'ROUND_END') {
        const teamA = state.teams?.A || { roundScore: 0, totalScore: 0, hasTakenMour: true, melds: [] };
        const teamB = state.teams?.B || { roundScore: 0, totalScore: 0, hasTakenMour: true, melds: [] };

        return (
            <div className="flex flex-col items-center justify-center h-screen bg-black/90 text-white relative z-50 backdrop-blur-md">
                <div className="bg-slate-900 p-8 rounded-2xl border border-white/10 max-w-2xl w-full shadow-2xl">
                    <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Round {state.roundNumber} Complete
                    </h2>

                    <div className="grid grid-cols-2 gap-8 mb-8">
                        {/* Team A Stats */}
                        <div className="bg-slate-800/50 p-6 rounded-xl border border-blue-500/20">
                            <h3 className="text-xl font-bold text-blue-400 mb-4 border-b border-blue-500/20 pb-2">{state.teams.A.name || 'TEAM A'}</h3>
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-slate-400">Round Score</span>
                                <span className="text-2xl font-mono font-bold text-white">+{teamA.roundScore}</span>
                            </div>
                            <div className="flex justify-between items-end">
                                <span className="text-slate-400">Total Score</span>
                                <span className="text-2xl font-mono font-bold text-blue-300">{teamA.totalScore}</span>
                            </div>
                            {!teamA.hasTakenMour && <div className="text-xs text-red-400 mt-2 font-bold uppercase">Penalty: No Mour (-10 pts)</div>}
                        </div>

                        {/* Team B Stats */}
                        <div className="bg-slate-800/50 p-6 rounded-xl border border-red-500/20">
                            <h3 className="text-xl font-bold text-red-400 mb-4 border-b border-red-500/20 pb-2">{state.teams.B.name || 'TEAM B'}</h3>
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-slate-400">Round Score</span>
                                <span className="text-2xl font-mono font-bold text-white">+{teamB.roundScore}</span>
                            </div>
                            <div className="flex justify-between items-end">
                                <span className="text-slate-400">Total Score</span>
                                <span className="text-2xl font-mono font-bold text-red-300">{teamB.totalScore}</span>
                            </div>
                            {!teamB.hasTakenMour && <div className="text-xs text-red-400 mt-2 font-bold uppercase">Penalty: No Mour (-10 pts)</div>}
                        </div>
                    </div>

                    <div className="flex justify-center mt-8">
                        {isHost ? (
                            <button
                                onClick={() => actions.nextRound()}
                                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold px-12 py-4 rounded-xl shadow-lg hover:scale-105 transition-all"
                            >
                                Start Next Round
                            </button>
                        ) : (
                            <div className="flex items-center text-slate-400 animate-pulse">
                                <span className="mr-2">⏳</span> Waiting for host to start next round...
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // 3. Welcome Screen (No Players)
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



                        {view === 'WELCOME' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Team A Name</label>
                                    <input
                                        className="w-full bg-slate-800 border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="Team A"
                                        value={teamAName}
                                        onChange={e => setTeamAName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Team B Name</label>
                                    <input
                                        className="w-full bg-slate-800 border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                                        placeholder="Team B"
                                        value={teamBName}
                                        onChange={e => setTeamBName(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

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
            </div >
        );
    }

    // 4. Lobby Screen (Waiting for Players)
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
                                <div key={i} className={`h-40 rounded-xl border-2 flex flex-col items-center justify-center p-4 transition-all relative group ${player ? 'bg-slate-800 border-green-500 shadow-lg shadow-green-900/20' : 'bg-slate-900/50 border-slate-800 border-dashed'}`}>
                                    {player ? (
                                        <>
                                            {isHost && player.id !== peerId && (
                                                <button
                                                    className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-full transition-all opacity-0 group-hover:opacity-100"
                                                    title="Kick Player"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm(`Kick ${player.name}?`)) {
                                                            actions.kickPlayer(player.id);
                                                        }
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            )}
                                            <div className="w-16 h-16 bg-slate-700 rounded-full mb-3 flex items-center justify-center text-2xl">
                                                {player.name[0]?.toUpperCase()}
                                            </div>
                                            <div className="font-bold text-lg">{player.name}</div>
                                            <div className="flex gap-2 items-center mt-1">
                                                <div className={`px-2 py-0.5 rounded textxs font-bold ${player.teamId === 'A' ? 'bg-blue-500/20 text-blue-300' : 'bg-red-500/20 text-red-300'}`}>
                                                    {state.teams[player.teamId]?.name || `Team ${player.teamId}`}
                                                </div>
                                                {isHost && (
                                                    <button
                                                        onClick={() => actions.switchTeam(player.id)}
                                                        className="text-xs bg-white/10 hover:bg-white/20 p-1 rounded"
                                                        title="Switch Team"
                                                    >
                                                        ⇄
                                                    </button>
                                                )}
                                            </div>
                                            <div className="text-xs text-green-400 mt-1">{player.isHost ? 'HOST' : 'READY'}</div>
                                        </>
                                    ) : (
                                        <div className="text-slate-600">Empty Slot</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex justify-center gap-4">
                        {isHost && (
                            <button
                                className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-xl font-bold transition-all border border-slate-700"
                                onClick={() => actions.addBot(`Bot ${state.players.length + 1}`)}
                            >
                                + Add Bot
                            </button>
                        )}
                        <button
                            disabled={!isHost || state.players.length < 1}
                            className={`px-12 py-4 rounded-xl font-bold text-xl shadow-xl transition-all disabled:opacity-50 disabled:scale-100 ${isHost
                                ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white hover:scale-105"
                                : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                                }`}
                            onClick={() => isHost && actions.startGame()}
                        >
                            {isHost ? "START GAME" : "Waiting for host to start the game"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }


    const myPlayer = state.players.find(p => p.id === peerId);

    // Logic to identify teammate and enemies for 4-player view (or 2-player adaptation)
    const myTeamId = myPlayer?.teamId || 'A'; // Default to A if observer or error
    const teammate = state.players.find(p => p.id !== peerId && p.teamId === myTeamId);
    // get enemies (different team)
    const enemies = state.players.filter(p => p.teamId !== myTeamId);
    // Assign Left/Right arbitrarily or by index for consistency
    const enemyLeft = enemies[0];
    const enemyRight = enemies[1]; // Might be undefined in 3-player or 2-player games

    const isMyTurn = state.currentTurnPlayerId === peerId;
    const handCards = myPlayer?.hand || [];

    // Dynamic Team Sides
    const leftTeamId = myTeamId;
    const rightTeamId = myTeamId === 'A' ? 'B' : 'A';
    const leftTeam = state.teams[leftTeamId];
    const rightTeam = state.teams[rightTeamId];

    // Mour Counter
    // A team "has taken mour" means 1 pile is gone. 
    // moursRemaining = 2 - (A_taken ? 1 : 0) - (B_taken ? 1 : 0)
    const moursRemaining = 2 - (state.teams.A.hasTakenMour ? 1 : 0) - (state.teams.B.hasTakenMour ? 1 : 0);

    const toggleSelect = (cardId: string) => {
        setSelectedCards(prev =>
            prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
        );
    };

    const toggleMeldSelect = (meldId: string) => {
        setSelectedMeldId(prev => (prev === meldId ? null : meldId));
    };



    // Action Wrappers with Feedback
    const handleMeld = () => {
        if (state.turnPhase === 'WAITING_FOR_DRAW') {
            showToast("Draw a card first!");
            return;
        }
        if (peerId) actions.meldCards(peerId, handCards.filter(c => selectedCards.includes(c.id)));
        setSelectedCards([]);
    };

    const handleAddToMeld = () => {
        if (state.turnPhase === 'WAITING_FOR_DRAW') {
            showToast("Draw a card first!");
            return;
        }
        if (!peerId || !selectedMeldId) return;
        actions.addToMeld(peerId, selectedMeldId, handCards.filter(c => selectedCards.includes(c.id)));
        setSelectedCards([]);
        setSelectedMeldId(null);
    };

    const handleDiscard = () => {
        if (state.turnPhase === 'WAITING_FOR_DRAW') {
            showToast("Draw a card first!");
            return;
        }
        if (peerId && selectedCards.length === 1) {
            actions.discardCard(peerId, selectedCards[0]);
            setSelectedCards([]);
        }
    };



    return (
        <div className="flex flex-col h-screen w-screen bg-[#35654d] text-white overflow-hidden relative font-sans select-none">
            {/* Background Texture Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-30 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] mix-blend-overlay z-0"></div>

            {/* ERROR / FEEDBACK POPUP */}
            {toastMessage && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className="bg-red-600 text-white font-bold px-6 py-3 rounded-xl shadow-2xl border-2 border-white/20 flex items-center gap-3">
                        <span className="text-2xl">⚠️</span>
                        <span>{toastMessage}</span>
                    </div>
                </div>
            )}

            {/* Main Grid Container */}
            <div className="relative z-10 w-full h-full grid grid-rows-[15%_55%_30%] p-4 gap-4">

                {/* --- TOP ROW: Teammate --- */}
                <div className="relative flex justify-center items-start">
                    {teammate ? (
                        <div className={`flex flex-col items-center transition-all duration-300 ${teammate.id === state.currentTurnPlayerId ? 'scale-110 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]' : ''}`}>
                            {/* Stacked Card Backs (Extended Distribution) */}
                            <div className="relative h-24 flex justify-center items-center">
                                <div className="flex -space-x-8">
                                    {Array.from({ length: Math.min(teammate.hand.length, 8) }).map((_, i) => (
                                        <div key={i} className="relative hover:-translate-y-2 transition-transform">
                                            <Card isFaceDown deckColor={i % 2 === 0 ? 'blue' : 'red'} className="w-24 h-36 lg:w-32 lg:h-48 shadow-md" />
                                        </div>
                                    ))}
                                </div>
                                {/* Enhanced Count Badge */}
                                {teammate.hand.length > 8 && (
                                    <div className="absolute -right-8 top-0 bg-yellow-500 text-black font-black text-xs px-2 py-1 rounded-full border border-white shadow-xl z-20">
                                        +{teammate.hand.length - 8}
                                    </div>
                                )}
                            </div>

                            <div className="mt-2 bg-black/50 px-4 py-1 rounded-full backdrop-blur-sm border border-white/20">
                                <span className={`font-black tracking-wide text-lg ${teammate.id === state.currentTurnPlayerId ? 'text-yellow-400' : 'text-blue-100'}`}>
                                    {teammate.name.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="opacity-30 text-sm font-bold uppercase tracking-widest">No Teammate</div>
                    )}

                    {/* Score Board (Top Center Overlay) */}
                    <div className="absolute top-0 right-0 bg-black/60 px-6 py-3 rounded-xl border border-white/20 backdrop-blur-md shadow-xl">
                        <div className="flex gap-8 text-base font-black tracking-wider">
                            <div className="text-blue-400 flex flex-col items-center leading-none">
                                <span>{state.teams.A.name || 'TEAM A'}</span>
                                <span className="text-2xl text-white">{state.teams.A.totalScore}</span>
                                <span className="text-[10px] text-white/50">+{state.teams.A.roundScore}</span>
                            </div>
                            <div className="w-px bg-white/20"></div>
                            <div className="text-red-400 flex flex-col items-center leading-none">
                                <span>{state.teams.B.name || 'TEAM B'}</span>
                                <span className="text-2xl text-white">{state.teams.B.totalScore}</span>
                                <span className="text-[10px] text-white/50">+{state.teams.B.roundScore}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- MIDDLE ROW: Enemies + Melds --- */}
                <div className="grid grid-cols-[15%_35%_35%_15%] h-full w-full gap-2">

                    {/* LEFT COLUMN: Enemy 1 (Left) */}
                    <div className="flex items-center justify-start">
                        {enemyLeft && (
                            <div className={`flex flex-row items-center gap-4 transition-all duration-300 ${enemyLeft.id === state.currentTurnPlayerId ? 'scale-110 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]' : ''}`}>
                                {/* Stacked Cards (Vertical for side player - Extended) */}
                                <div className="relative w-28 lg:w-32 flex flex-col items-center h-80 overflow-visible">
                                    <div className="relative w-full h-full">
                                        {Array.from({ length: Math.min(enemyLeft.hand.length, 8) }).map((_, i) => (
                                            <div key={i} className="absolute left-0 w-full h-20 transition-all hover:translate-x-2" style={{ top: `${i * 32}px` }}> {/* Increased spacing */}
                                                <Card isFaceDown deckColor={i % 2 === 0 ? 'red' : 'blue'} className="w-full h-full shadow-md" />
                                            </div>
                                        ))}
                                    </div>
                                    {/* Enhanced Badge */}
                                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-yellow-500 text-black font-black text-xl px-3 py-1 rounded-full border-2 border-white shadow-xl z-20">
                                        {enemyLeft.hand.length}
                                    </div>
                                </div>

                                <div className="-rotate-90 whitespace-nowrap bg-black/50 px-3 py-2 rounded-lg border border-white/20 backdrop-blur-sm">
                                    <span className={`font-black tracking-wide text-lg ${enemyLeft.id === state.currentTurnPlayerId ? 'text-yellow-400' : 'text-white'}`}>
                                        {enemyLeft.name.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* CENTER LEFT: My/Left Team Melds */}
                    <div className="bg-black/20 rounded-l-2xl border-r border-white/20 p-4 relative flex flex-col">
                        <div className={`text-xs font-black ${leftTeamId === 'A' ? 'text-blue-400' : 'text-red-400'} opacity-80 tracking-[0.2em] uppercase mb-2`}>
                            {leftTeamId === 'A' ? (state.teams.A.name || 'Team A') : (state.teams.B.name || 'Team B')} Melds {leftTeamId === myTeamId ? '(YOU)' : ''}
                        </div>
                        <div className="flex-1 flex flex-wrap content-start gap-2 overflow-visible">
                            {(leftTeam?.melds || []).map(meld => (
                                <div key={meld.id}
                                    id={`meld-drop-${meld.id}`}
                                    data-meld-id={meld.id}
                                    onClick={() => isMyTurn && myPlayer?.teamId === leftTeamId && toggleMeldSelect(meld.id)}
                                    className={`relative group transition-all cursor-pointer transform hover:scale-105 ${selectedMeldId === meld.id ? 'ring-2 ring-yellow-400 rounded-lg bg-white/5' : ''}`}>
                                    <div className="flex -space-x-8">
                                        {meld.cards.map((c, idx) => (
                                            <div key={c.id} className="relative shadow-md" style={{ zIndex: idx }}>
                                                <Card card={c} className="w-20 h-28 md:w-24 md:h-36 border border-black/20" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="absolute -bottom-6 right-0 bg-black/60 text-[10px] font-bold text-white px-2 rounded-full border border-white/10">
                                        {calculateMeldBonus(meld)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CENTER RIGHT: Enemy/Right Team Melds */}
                    <div className="bg-black/20 rounded-r-2xl border-l border-white/20 p-4 relative flex flex-col pl-6">
                        <div className={`text-xs font-black ${rightTeamId === 'A' ? 'text-blue-400' : 'text-red-400'} opacity-80 tracking-[0.2em] uppercase mb-2 text-right`}>
                            {rightTeamId === 'A' ? (state.teams.A.name || 'Team A') : (state.teams.B.name || 'Team B')} Melds {rightTeamId !== myTeamId ? '(ENEMY)' : ''}
                        </div>
                        <div className="flex-1 flex flex-wrap content-start gap-2 justify-end overflow-visible">
                            {(rightTeam?.melds || []).map(meld => (
                                <div key={meld.id}
                                    id={`meld-drop-${meld.id}`}
                                    data-meld-id={meld.id}
                                    onClick={() => isMyTurn && myPlayer?.teamId === rightTeamId && toggleMeldSelect(meld.id)}
                                    className={`relative group transition-all cursor-pointer transform hover:scale-105 ${selectedMeldId === meld.id ? 'ring-2 ring-yellow-400 rounded-lg bg-white/5' : ''}`}>
                                    <div className="flex -space-x-8">
                                        {meld.cards.map((c, idx) => (
                                            <div key={c.id} className="relative shadow-md" style={{ zIndex: idx }}>
                                                <Card card={c} className="w-20 h-28 md:w-24 md:h-36 border border-black/20" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="absolute -bottom-6 left-0 bg-black/60 text-[10px] font-bold text-white px-2 rounded-full border border-white/10">
                                        {calculateMeldBonus(meld)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Enemy 2 (Right) */}
                    <div className="flex items-center justify-end">
                        {enemyRight && (
                            <div className={`flex flex-row-reverse items-center gap-4 transition-all duration-300 ${enemyRight.id === state.currentTurnPlayerId ? 'scale-110 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]' : ''}`}>
                                <div className="relative w-28 lg:w-32 flex flex-col items-center h-80 overflow-visible">
                                    <div className="relative w-full h-full">
                                        {Array.from({ length: Math.min(enemyRight.hand.length, 8) }).map((_, i) => (
                                            <div key={i} className="absolute right-0 w-full h-20 transition-all hover:-translate-x-2" style={{ top: `${i * 32}px` }}>
                                                <Card isFaceDown deckColor={i % 2 === 0 ? 'red' : 'blue'} className="w-full h-full shadow-md" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="absolute -bottom-4 right-1/2 translate-x-1/2 bg-yellow-500 text-black font-black text-xl px-3 py-1 rounded-full border-2 border-white shadow-xl z-20">
                                        {enemyRight.hand.length}
                                    </div>
                                </div>
                                <div className="rotate-90 whitespace-nowrap bg-black/50 px-3 py-2 rounded-lg border border-white/20 backdrop-blur-sm">
                                    <span className={`font-black tracking-wide text-lg ${enemyRight.id === state.currentTurnPlayerId ? 'text-yellow-400' : 'text-white'}`}>
                                        {enemyRight.name.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- BOTTOM ROW: Controls & Hand --- */}
                <div className="grid grid-cols-[15%_70%_15%] pt-2">

                    {/* LEFT: Deck Only */}
                    <div className="flex items-end justify-start pl-12 pb-16">
                        <div className="relative group cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => {
                                if (!isMyTurn || state.turnPhase !== 'WAITING_FOR_DRAW') { // Only allow if correct phase
                                    // Optional: Feedback here too?
                                }
                                if (isMyTurn && state.turnPhase === 'WAITING_FOR_DRAW' && peerId) actions.drawCard(peerId);
                            }}>
                            {/* Deck Stack Visual (Using Real Cards) */}
                            <div className="relative w-36 h-[13.5rem]">
                                {[0, 1, 2].map(i => (
                                    <div key={i} className="absolute inset-0" style={{ transform: `translate(-${i * 3}px, -${i * 3}px)` }}>
                                        <Card isFaceDown deckColor={state.deck.length % 2 === 0 ? 'blue' : 'red'} className="w-full h-full shadow-lg" />
                                    </div>
                                ))}
                            </div>
                            <div className="absolute -top-8 w-full text-center font-bold text-blue-200 tracking-widest uppercase text-sm">Deck ({state.deck.length})</div>
                        </div>
                    </div>

                    {/* CENTER: Discard (Top) + Hand (Bottom) */}
                    <div className="relative flex flex-col justify-end items-center h-full">

                        {/* 1. DISCARD AREA (Spread Above Hand) */}
                        <div className="mb-4 w-full flex justify-center items-end"
                            onClick={() => isMyTurn && state.turnPhase === 'WAITING_FOR_DRAW' && peerId && actions.sweepPile(peerId)}>
                            {state.discardPile.length > 0 ? (
                                <div className="relative h-[7.2rem] flex items-center cursor-pointer group hover:scale-105 transition-transform bg-slate-300/20 px-[4rem] py-2 rounded-2xl border border-white/20 backdrop-blur-sm shadow-xl">
                                    {/* Fan the last 8 cards horizontally */}
                                    <div className="flex -space-x-8">
                                        {state.discardPile.slice(Math.max(0, state.discardPile.length - 8)).map((card) => (
                                            <div key={card.id} className="relative hover:-translate-y-4 transition-transform duration-200">
                                                <Card card={card} className="w-16 h-24 lg:w-20 lg:h-28 shadow-lg brightness-90 border border-black/30" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="ml-8 bg-black/60 px-3 py-1 rounded-full text-xs font-bold text-yellow-500 border border-yellow-500/30 opacity-80 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                        DISCARD PILE ({state.discardPile.length})
                                    </div>
                                </div>
                            ) : (
                                <div className="w-[15.6rem] h-[7.2rem] bg-slate-300/10 border-2 border-dashed border-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                                    <span className="text-white/40 font-bold tracking-widest text-xs uppercase">Discard Empty</span>
                                </div>
                            )}
                        </div>

                        {/* 2. PLAYER HAND */}
                        <div className="relative flex justify-center w-full z-20 pb-4">
                            {/* Action Buttons (Floating above hand) */}
                            <div className={`absolute -top-20 flex gap-4 transition-all duration-200 z-50 ${selectedCards.length > 0 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'}`}>
                                <button
                                    disabled={!isMyTurn}
                                    onClick={handleMeld}
                                    className="px-6 py-2 bg-gradient-to-t from-yellow-700 to-yellow-500 text-white font-black rounded-lg shadow-[0_0_15px_rgba(234,179,8,0.5)] border-2 border-yellow-300 hover:scale-105 active:scale-95 uppercase tracking-wider text-sm">
                                    Meld
                                </button>
                                <button
                                    disabled={!isMyTurn || !selectedMeldId}
                                    onClick={handleAddToMeld}
                                    className="px-6 py-2 bg-gradient-to-t from-blue-700 to-blue-500 text-white font-black rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.5)] border-2 border-blue-300 hover:scale-105 active:scale-95 uppercase tracking-wider text-sm">
                                    Add to Meld
                                </button>
                                <button
                                    disabled={!isMyTurn || selectedCards.length !== 1}
                                    onClick={handleDiscard}
                                    className="px-6 py-2 bg-gradient-to-t from-red-700 to-red-500 text-white font-black rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.5)] border-2 border-red-300 hover:scale-105 active:scale-95 uppercase tracking-wider text-sm">
                                    Discard
                                </button>
                            </div>

                            {myPlayer && (
                                <Reorder.Group axis="x" values={handCards} onReorder={(newOrder) => { if (peerId) actions.reorderHand(peerId, newOrder); }} className="flex -space-x-12 px-8">
                                    <AnimatePresence initial={false}>
                                        {handCards.map((card) => (
                                            <Reorder.Item key={card.id} value={card}
                                                whileDrag={{ scale: 1.1, zIndex: 100, boxShadow: "0px 10px 20px rgba(0,0,0,0.5)" }}
                                                onDragEnd={(_event, info) => {
                                                    // Detection Logic
                                                    const dropTarget = document.elementFromPoint(info.point.x, info.point.y);
                                                    const meldContainer = dropTarget?.closest('[data-meld-id]');

                                                    if (meldContainer && isMyTurn && state.turnPhase === 'PLAYING' && peerId) {
                                                        const meldId = meldContainer.getAttribute('data-meld-id');
                                                        if (meldId) {
                                                            actions.addToMeld(peerId, meldId, [card]);
                                                        }
                                                    }
                                                }}
                                                className="relative transition-transform duration-200">
                                                <div className="hover:-translate-y-10 transition-transform duration-200 origin-bottom hover:z-20 relative">
                                                    <Card card={card}
                                                        isSelected={selectedCards.includes(card.id)}
                                                        onClick={() => toggleSelect(card.id)}
                                                        disableLayout={true} // Disable internal layout
                                                        disableHover={true} // Disable internal hover
                                                        className="w-32 h-48 shadow-2xl ring-1 ring-black/50" />
                                                </div>
                                            </Reorder.Item>
                                        ))}
                                    </AnimatePresence>
                                </Reorder.Group>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Mour Area */}
                    <div className="flex flex-col items-center justify-end pb-12 pr-8 opacity-90">
                        {/* Two distinct decks stacked: one vertical, one horizontal */}
                        <div className="relative w-36 h-36 flex items-center justify-center">
                            {/* Pile 1: Vertical (Only if at least 1 mour left) */}
                            {moursRemaining > 0 && (
                                <div className="absolute transition-transform hover:scale-110 z-0">
                                    <Card isFaceDown deckColor="red" className="w-24 h-36 shadow-lg" />
                                    <div className="absolute inset-0 flex items-center justify-center font-bold text-white/50 text-xl">11</div>
                                </div>
                            )}
                            {/* Pile 2: Horizontal (Only if 2 mours left) */}
                            {moursRemaining > 1 && (
                                <div className="absolute transition-transform hover:scale-110 z-10 rotate-90">
                                    <Card isFaceDown deckColor="blue" className="w-24 h-36 shadow-lg" />
                                    <div className="absolute inset-0 flex items-center justify-center font-bold text-white/50 text-xl -rotate-90">11</div>
                                </div>
                            )}
                            {moursRemaining === 0 && (
                                <div className="text-white/20 text-xs font-bold uppercase tracking-widest border-2 border-white/10 border-dashed p-4 rounded-lg">
                                    No Mour
                                </div>
                            )}
                        </div>
                        <div className="mt-4 text-xs font-black text-white/50 bg-black/30 px-3 py-1 rounded-full uppercase tracking-widest">
                            Mour Area
                        </div>

                        <div className="mt-4 text-[10px] text-white/40 font-mono text-center">
                            Phase: {state.turnPhase}
                            <br />
                            Turn: {isMyTurn ? 'YOU' : state.currentTurnPlayerId?.slice(0, 4)}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
