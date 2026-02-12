import { useState, useRef, useEffect, type CSSProperties } from 'react';
import { useGame } from '../../hooks/useGame';
import { Card } from './Card';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { calculateMeldBonus } from '../../engine/scoring';
import { translations, type Language } from '../../lib/translations';

export function GameBoard() {
    const { state, actions, peerId } = useGame();
    const isHost = state.players.find(p => p.id === peerId)?.isHost;
    const [selectedCards, setSelectedCards] = useState<string[]>([]);
    const [selectedMeldId, setSelectedMeldId] = useState<string | null>(null);
    const [lang, setLang] = useState<Language>('en'); // Language State
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [showFirstTurnChoice, setShowFirstTurnChoice] = useState<{ cardId: string } | null>(null);
    const [viewportWidth, setViewportWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1024));
    const hasInitializedActionSoundRefs = useRef(false);
    const previousActionSoundCounts = useRef({ discardCount: 0, meldCardCount: 0 });

    // Audio Refs
    const drawSound = useRef(new Audio('/sounds/card-draw.wav'));
    const discardSound = useRef(new Audio('/sounds/discard.wav'));
    const shuffleSound = useRef(new Audio('/sounds/shuffle.wav'));

    const playSound = (audioRef: React.RefObject<HTMLAudioElement>) => {
        if (soundEnabled && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => console.log("Audio play blocked", e));
        }
    };
    // --- HELPER: Settings Modal ---
    const renderSettingsModal = () => {
        if (!showSettings) return null;
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl shadow-2xl w-full max-w-sm relative">
                    <button
                        onClick={() => setShowSettings(false)}
                        className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                    <h2 className="text-2xl font-bold text-white mb-6 text-center">{t.settings}</h2>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs uppercase text-slate-500 font-bold mb-3">{t.language}</label>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setLang('en')}
                                    className={`flex-1 py-3 rounded-xl font-bold transition-all border-2 ${lang === 'en' ? 'bg-yellow-500/10 border-yellow-500 text-yellow-400' : 'bg-slate-800 border-transparent text-slate-400 hover:bg-slate-700'}`}
                                >
                                    English 🇺🇸
                                </button>
                                <button
                                    onClick={() => setLang('ar')}
                                    className={`flex-1 py-3 rounded-xl font-bold transition-all border-2 ${lang === 'ar' ? 'bg-yellow-500/10 border-yellow-500 text-yellow-400' : 'bg-slate-800 border-transparent text-slate-400 hover:bg-slate-700'}`}
                                >
                                    العربية 🇸🇦
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs uppercase text-slate-500 font-bold mb-3">{t.sounds}</label>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSoundEnabled(true)}
                                    className={`flex-1 py-3 rounded-xl font-bold transition-all border-2 ${soundEnabled ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-slate-800 border-transparent text-slate-400 hover:bg-slate-700'}`}
                                >
                                    {t.on}
                                </button>
                                <button
                                    onClick={() => setSoundEnabled(false)}
                                    className={`flex-1 py-3 rounded-xl font-bold transition-all border-2 ${!soundEnabled ? 'bg-red-500/10 border-red-500 text-red-400' : 'bg-slate-800 border-transparent text-slate-400 hover:bg-slate-700'}`}
                                >
                                    {t.off}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8">
                        <button
                            onClick={() => setShowSettings(false)}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-all"
                        >
                            {t.close}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const t = translations[lang]; // Translation Helper

    const [playerName, setPlayerName] = useState('');
    const [teamAName, setTeamAName] = useState('Team A'); // New State
    const [teamBName, setTeamBName] = useState('Team B'); // New State
    const [joinHostId, setJoinHostId] = useState('');
    const [view, setView] = useState<'WELCOME' | 'JOIN'>('WELCOME');
    const [isLoading, setIsLoading] = useState(false);
    const [isDealing, setIsDealing] = useState(false);
    const [dealingCardIndex, setDealingCardIndex] = useState(-1); // -1: Not dealing, 0-10: Dealing cards 1-11 sequentially

    // Dealing Animation Trigger
    useEffect(() => {
        if (state.phase === 'PLAYING') {
            setIsDealing(true);
            setDealingCardIndex(0);

            // Play Sound (One-shot)
            playSound(shuffleSound);

            // Animate 44 cards distribution
            const totalCards = 44;
            const delayPerCard = 20; // ms (Very Fast)

            const interval = setInterval(() => {
                setDealingCardIndex(prev => {
                    if (prev >= totalCards + 15) {
                        clearInterval(interval);
                        return prev;
                    }
                    return prev + 1;
                });
            }, delayPerCard);

            const totalTime = totalCards * delayPerCard + 500; // ~1.4s total
            const timer = setTimeout(() => {
                setIsDealing(false);
                setDealingCardIndex(-1);
            }, totalTime);

            return () => {
                clearTimeout(timer);
                clearInterval(interval);
            };
        }
    }, [state.phase, state.roundNumber]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleResize = () => setViewportWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Play action sounds for all players (local + remote) based on state deltas.
    useEffect(() => {
        const discardCount = state.discardPile.length;
        const meldCardCount =
            (state.teams.A.melds || []).reduce((sum, meld) => sum + meld.cards.length, 0) +
            (state.teams.B.melds || []).reduce((sum, meld) => sum + meld.cards.length, 0);

        if (!hasInitializedActionSoundRefs.current) {
            hasInitializedActionSoundRefs.current = true;
            previousActionSoundCounts.current = { discardCount, meldCardCount };
            return;
        }

        if (discardCount > previousActionSoundCounts.current.discardCount) {
            playSound(discardSound);
        }
        if (meldCardCount > previousActionSoundCounts.current.meldCardCount) {
            playSound(drawSound);
        }

        previousActionSoundCounts.current = { discardCount, meldCardCount };
    }, [state.discardPile.length, state.teams.A.melds, state.teams.B.melds]);

    // Helper to calculate how many cards should be visible in a player's hand during dealing
    const getVisibleCardCount = (targetPlayerId: string, totalHandSize: number) => {
        if (!isDealing) return totalHandSize;

        // Find player's turn index (0-3) relative to the start of the game/round?
        // Actually, let's look at state.players index.
        const playerIndex = state.players.findIndex(p => p.id === targetPlayerId);
        if (playerIndex === -1) return 0;

        // Cards land after ~12 steps (480ms ~ 0.5s flight)
        const landThreshold = 12;
        const effectiveDealIndex = dealingCardIndex - landThreshold;

        if (effectiveDealIndex < 0) return 0;

        // Count how many cards in 0..effectiveDealIndex belong to THIS player (i % 4 == playerIndex)
        // If effectiveDealIndex is N, number of full rounds is floor((N+1)/4).
        // Plus one if the remainder covers this player.

        // Example: N=4, Rounds=1 (0,1,2,3). Indices 0,1,2,3 dealt. Player 0 gets card 0, card 4? No card 4 is index 4.
        // If effective is 4. Range 0,1,2,3,4.
        // Player 0 gets: 0, 4. (2 cards)
        // Player 1 gets: 1. (1 card)

        const fullRounds = Math.floor((effectiveDealIndex + 1) / 4);
        const remainder = (effectiveDealIndex + 1) % 4;

        // If my index is < remainder, I got an extra card in the partial round
        let count = fullRounds + (playerIndex < remainder ? 1 : 0);

        return Math.min(count, totalHandSize);
    };

    // Feedback Toast State (Hoisted to top)
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

    // --- BOT LOGIC ---
    useEffect(() => {
        if (!isHost || state.phase !== 'PLAYING') return;

        const currentPlayer = state.players.find(p => p.id === state.currentTurnPlayerId);
        if (!currentPlayer || !currentPlayer.id.startsWith('bot-')) return;

        const botId = currentPlayer.id;

        // Bot Turn Step 1: Draw
        if (state.turnPhase === 'WAITING_FOR_DRAW') {
            const timer = setTimeout(() => {
                actions.drawCard(botId);
            }, 1000);
            return () => clearTimeout(timer);
        }

        // Bot Turn Step 2: Discard IMMEDIATELY (The card just drawn)
        if (state.turnPhase === 'PLAYING') {
            // "always draw and throw the same card"
            if (state.lastDrawnCardId) {
                const timer = setTimeout(() => {
                    actions.discardCard(botId, state.lastDrawnCardId!, true);
                }, 1000);
                return () => clearTimeout(timer);
            }
        }
    }, [state.currentTurnPlayerId, state.turnPhase, state.phase, isHost, state.lastDrawnCardId, actions]);

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
                        <div className="text-slate-400 animate-pulse">{t.waiting}</div>
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
                                <span className="mr-2">⏳</span> {t.waiting}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // --- RENDER ---
    // 3. Welcome Screen (No Players)
    if (state.phase === 'LOBBY' && state.players.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-900/40 via-slate-950 to-slate-950" />

                <div className="z-10 bg-slate-900/80 p-8 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-md max-w-md w-full">
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent mb-2 text-center">{t.borako}</h1>
                    <p className="text-blue-200 text-center mb-8">{t.subtitle}</p>

                    <div className="absolute top-4 right-4 z-50">
                        <button
                            onClick={() => setShowSettings(true)}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-all backdrop-blur-sm"
                            title={t.settings}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs uppercase text-slate-500 font-bold mb-1">{t.yourNameLabel}</label>
                            <input
                                className="w-full bg-slate-800 border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-yellow-500 outline-none transition-all"
                                placeholder={t.yourNamePlaceholder}
                                value={playerName}
                                onChange={e => setPlayerName(e.target.value)}
                            />
                        </div>



                        {view === 'WELCOME' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs uppercase text-slate-500 font-bold mb-1">{t.teamANameLabel}</label>
                                    <input
                                        className="w-full bg-slate-800 border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder={t.teamA}
                                        value={teamAName}
                                        onChange={e => setTeamAName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-slate-500 font-bold mb-1">{t.teamBNameLabel}</label>
                                    <input
                                        className="w-full bg-slate-800 border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                                        placeholder={t.teamB}
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
                                    {isLoading ? t.loading : t.hostGame}
                                </button>
                                <button
                                    onClick={() => setView('JOIN')}
                                    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-lg border border-slate-700 transition-all"
                                >
                                    {t.joinGame}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4 pt-2">
                                <div>
                                    <label className="block text-xs uppercase text-slate-500 font-bold mb-1">{t.hostIdLabel}</label>
                                    <input
                                        className="w-full bg-slate-800 border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                                        placeholder={t.hostIdPlaceholder}
                                        value={joinHostId}
                                        onChange={e => setJoinHostId(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setView('WELCOME')}
                                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-lg transition-all"
                                    >
                                        {t.back}
                                    </button>
                                    <button
                                        disabled={!playerName.trim() || !joinHostId.trim() || isLoading}
                                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex justify-center items-center"
                                        onClick={handleJoin}
                                    >
                                        {isLoading ? <span className="animate-spin mr-2">⟳</span> : null}
                                        {isLoading ? t.joining : t.join}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="text-xs text-slate-600 absolute bottom-4">v1.0.0 • PeerJS Powered</div>
                {renderSettingsModal()}
            </div >
        );
    }

    // 4. Lobby Screen (Waiting for Players)
    if (state.phase === 'LOBBY') {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white relative">
                <div className="absolute top-4 left-4 z-50">
                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-all backdrop-blur-sm"
                        title={t.settings}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                    </button>
                </div>
                <div className="w-full max-w-4xl p-8">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-4xl font-bold text-white">{t.lobby}</h1>
                            <p className="text-slate-400">{t.waiting}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs uppercase text-slate-500 font-bold">{t.roomCode}</p>
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
                                <div className="text-xs text-yellow-500 mt-2 text-right">{t.connecting}</div>
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
                                        <div className="text-slate-600">{t.emptySlot}</div>
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
                                {t.addBot}
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
                            {isHost ? t.startGame : t.waiting}
                        </button>
                    </div>
                </div>
                {renderSettingsModal()}
            </div>
        );
    }


    const myPlayer = state.players.find(p => p.id === peerId);

    // Logic to identify teammate and enemies for 4-player view (or 2-player adaptation)
    const myTeamId = myPlayer?.teamId || 'A'; // Default to A if observer or error
    const teammate = state.players.find(p => p.id !== peerId && p.teamId === myTeamId);
    // get enemies (different team)
    const enemies = state.players.filter(p => p.teamId !== myTeamId);

    // Position enemies relative to ME (Counter-Clockwise View)
    // In 4-player [A1, B1, A2, B2], if I am A1 (0): R=3(B2), L=1(B1).
    // Turn order is 0 -> 3 -> 2 -> 1 (Me -> Right -> Teammate -> Left)
    let enemyLeft = enemies[0];
    let enemyRight = enemies[1];

    if (state.players.length === 4 && myPlayer) {
        const myIndex = state.players.findIndex(p => p.id === peerId);
        if (myIndex !== -1) {
            const rightIndex = (myIndex - 1 + 4) % 4;
            const leftIndex = (myIndex + 1) % 4;

            // Assign based on calculated indices (Validation check: ensure they are actually enemies)
            const pRight = state.players[rightIndex];
            const pLeft = state.players[leftIndex];

            if (pRight.teamId !== myTeamId) enemyRight = pRight;
            if (pLeft.teamId !== myTeamId) enemyLeft = pLeft;
        }
    }

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
    const isMobileViewport = viewportWidth < 768;
    const getMobileMeldCardClass = (meldCount: number) => {
        if (meldCount >= 10) return 'w-11 h-[3.9rem]';
        if (meldCount >= 8) return 'w-12 h-[4.35rem]';
        if (meldCount >= 6) return 'w-12 h-[4.6rem]';
        return 'w-14 h-20';
    };
    const getMobileMeldOverlapClass = (meldCount: number) => {
        if (meldCount >= 10) return '-space-x-[2.05rem]';
        if (meldCount >= 8) return '-space-x-[2.25rem]';
        if (meldCount >= 6) return '-space-x-[2.25rem]';
        return '-space-x-[2.55rem]';
    };
    const getDesktopMeldCardClass = (meldCount: number) => {
        if (meldCount >= 10) return 'w-14 h-20';
        if (meldCount >= 8) return 'w-16 h-24';
        if (meldCount >= 6) return 'w-20 h-[7.5rem]';
        return 'w-24 h-36';
    };
    const getDesktopMeldOverlapClass = (meldCount: number) => {
        if (meldCount >= 10) return '-space-x-8';
        if (meldCount >= 8) return '-space-x-10';
        if (meldCount >= 6) return '-space-x-12';
        return '-space-x-16';
    };
    const rightMeldCardClass = getMobileMeldCardClass(rightTeam?.melds?.length || 0);
    const leftMeldCardClass = getMobileMeldCardClass(leftTeam?.melds?.length || 0);
    const rightMeldOverlapClass = getMobileMeldOverlapClass(rightTeam?.melds?.length || 0);
    const leftMeldOverlapClass = getMobileMeldOverlapClass(leftTeam?.melds?.length || 0);
    const rightDesktopMeldCardClass = getDesktopMeldCardClass(rightTeam?.melds?.length || 0);
    const leftDesktopMeldCardClass = getDesktopMeldCardClass(leftTeam?.melds?.length || 0);
    const rightDesktopMeldOverlapClass = getDesktopMeldOverlapClass(rightTeam?.melds?.length || 0);
    const leftDesktopMeldOverlapClass = getDesktopMeldOverlapClass(leftTeam?.melds?.length || 0);
    const mobileDiscardCount = state.discardPile.length;
    const mobileDiscardContainerPx = isMobileViewport
        ? Math.max(132, Math.floor((viewportWidth - 24) * 0.56))
        : 224;
    const mobileDiscardInnerPx = Math.max(72, mobileDiscardContainerPx - 16); // px-2 left + right
    const mobileDiscardOverlapRatio = 0.79;
    const mobileDiscardStepRatio = 1 - mobileDiscardOverlapRatio;
    const mobileDiscardDenom = 1 + Math.max(0, mobileDiscardCount - 1) * mobileDiscardStepRatio;
    const mobileDiscardCardWidthPx = mobileDiscardCount > 0
        ? Math.max(16, Math.min(84, mobileDiscardInnerPx / Math.max(1, mobileDiscardDenom)))
        : 0;
    const mobileDiscardCardHeightPx = Math.round(mobileDiscardCardWidthPx * 1.43);
    const mobileDiscardOverlapPx = Math.round(mobileDiscardCardWidthPx * mobileDiscardOverlapRatio);

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
            showToast(t.drawFirst);
            return;
        }
        if (peerId) actions.meldCards(peerId, handCards.filter(c => selectedCards.includes(c.id)));
        setSelectedCards([]);
    };

    const handleAddToMeld = () => {
        if (state.turnPhase === 'WAITING_FOR_DRAW') {
            showToast(t.drawFirst);
            return;
        }
        if (!peerId || !selectedMeldId) return;
        actions.addToMeld(peerId, selectedMeldId, handCards.filter(c => selectedCards.includes(c.id)));
        setSelectedCards([]);
        setSelectedMeldId(null);
    };

    const handleDiscard = () => {
        if (state.turnPhase === 'WAITING_FOR_DRAW') {
            showToast(t.drawFirst);
            return;
        }
        if (peerId && selectedCards.length === 1) {
            const cardId = selectedCards[0];

            // SPECIAL RULE: First Turn Choice
            if (state.isFirstTurn && state.firstTurnDrawCount === 1) {
                setShowFirstTurnChoice({ cardId });
                return;
            }

            actions.discardCard(peerId, cardId);
            setSelectedCards([]);
        }
    };

    const handleFirstTurnChoice = (endTurn: boolean) => {
        if (peerId && showFirstTurnChoice) {
            // Enforcement: If drawing again, must be the last drawn card
            if (!endTurn && showFirstTurnChoice.cardId !== state.lastDrawnCardId) {
                showToast(t.mustDiscardLastDrawn);
                return;
            }

            actions.discardCard(peerId, showFirstTurnChoice.cardId, endTurn);
            setShowFirstTurnChoice(null);
            setSelectedCards([]);
        }
    };



    return (
        <div className="flex flex-col h-screen max-md:h-[100dvh] w-screen bg-[#35654d] text-white overflow-hidden relative font-sans select-none">
            <div className="absolute top-4 left-4 max-md:top-2 max-md:left-2 z-[60]">
                <button
                    onClick={() => setShowSettings(true)}
                    className="p-2 max-md:p-1.5 bg-black/20 hover:bg-black/40 rounded-full text-white/50 hover:text-white transition-all backdrop-blur-sm"
                    title={t.settings}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="max-md:w-5 max-md:h-5"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                </button>
            </div>
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
            <div className="relative z-10 w-full h-full grid md:grid-rows-[15%_55%_30%] max-md:flex max-md:flex-col p-4 max-md:p-0 gap-4 max-md:gap-0">

                {/* --- TOP ROW: Teammate + Score --- */}
                <div className="relative flex md:justify-center md:items-start max-md:flex-col max-md:justify-center max-md:items-center w-full max-md:h-auto max-md:py-1 max-md:flex-none z-50 px-2 max-md:bg-black/20 max-md:gap-1">

                    {/* Teammate (Compact Top Left on Mobile, Center Top on Desktop) */}
                    {teammate ? (
                        <div className={`flex items-center gap-2 max-md:w-auto md:flex-col md:transition-all md:duration-300 max-md:order-2 ${teammate.id === state.currentTurnPlayerId ? 'scale-110 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]' : ''}`}>
                            {/* Desktop Name Badge */}
                            <div className="mb-1 hidden md:block bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm border border-white/20">
                                <span className={`font-bold tracking-wide text-sm ${teammate.id === state.currentTurnPlayerId ? 'text-yellow-400' : 'text-blue-100'}`}>
                                    {teammate.name.toUpperCase()}
                                </span>
                            </div>

                            <div className="relative flex items-center h-10 md:h-20 max-md:order-2">
                                {/* Compact Card Row - Evenly Spaced */}
                                <div className="flex -space-x-4 max-md:-space-x-3 items-center md:-space-x-6">
                                    {Array.from({ length: teammate ? getVisibleCardCount(teammate.id, teammate.hand.length) : 0 }).map((_, i) => (
                                        <Card key={i} isFaceDown deckColor={i % 2 === 0 ? 'blue' : 'red'} className="w-8 h-12 md:w-16 md:h-24 shadow-sm border border-white/20 md:shadow-md" />
                                    ))}
                                </div>
                                <div className="absolute -right-2 -top-2 bg-yellow-500 text-black text-[10px] font-bold px-1.5 rounded-full border border-white shadow-sm z-10 transition-transform hover:scale-110 cursor-default md:text-xs md:px-2 md:py-0.5 md:-right-8 md:top-0">
                                    {teammate.hand.length}
                                </div>
                            </div>

                            {/* Mobile Name (Side) */}
                            <span className={`text-xs font-bold whitespace-nowrap md:hidden max-md:order-1 ${teammate.id === state.currentTurnPlayerId ? 'text-yellow-400' : 'text-blue-100'}`}>
                                {teammate.name.substring(0, 8).toUpperCase()}
                            </span>
                        </div>
                    ) : <div></div>}

                    <div className="absolute top-2 right-2 z-[60] md:hidden bg-black/50 px-2 py-0.5 rounded-md border border-white/15">
                        <span className="text-[11px] font-bold text-white/85 tracking-wide">
                            {state.teams.A.totalScore}/{state.teams.B.totalScore}
                        </span>
                    </div>

                    {/* Score Board (Compact Top Right on Mobile, Center Overlay on Desktop) */}
                    <div className="hidden md:block bg-black/60 px-3 py-1 rounded-lg border border-white/20 backdrop-blur-md md:absolute md:top-0 md:right-0 md:px-6 md:py-3 md:rounded-xl md:bg-black/60">
                        <div className="flex gap-3 text-xs font-black tracking-wider md:gap-8 md:text-base">
                            <div className="text-blue-400 flex items-center gap-1 md:flex-col md:leading-none">
                                <span>{state.teams.A.name || (typeof window !== 'undefined' && window.innerWidth > 768 ? t.teamA : 'A')}</span>
                                <span className="text-white text-sm md:text-2xl">{state.teams.A.totalScore}</span>
                                <span className="hidden md:block text-[10px] text-white/50">+{state.teams.A.roundScore}</span>
                            </div>
                            <div className="w-px bg-white/20 h-4 md:h-auto"></div>
                            <div className="text-red-400 flex items-center gap-1 md:flex-col md:leading-none">
                                <span className="hidden md:inline">{state.teams.B.name || t.teamB}</span>
                                <span className="text-white text-sm md:text-2xl">{state.teams.B.totalScore}</span>
                                <span className="md:hidden">{state.teams.B.name || 'B'}</span>
                                <span className="hidden md:block text-[10px] text-white/50">+{state.teams.B.roundScore}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- MIDDLE ROW: Enemies + Melds --- */}
                <div className="grid md:grid-cols-[10%_40%_40%_10%] max-md:grid-cols-[2.5rem_1fr_2.5rem] max-md:grid-rows-[1fr] h-full w-full gap-3 max-md:gap-1 max-md:flex-1 max-md:min-h-0 md:overflow-visible md:items-stretch items-start max-md:items-center max-md:px-1">

                    {/* DEALING ANIMATION OVERLAY */}
                    <AnimatePresence>
                        {isDealing && (
                            <motion.div
                                layoutId="deck-container"
                                className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            >
                                <div className="relative w-36 h-[13.5rem] shadow-2xl">
                                    {/* Static Deck Background */}
                                    {[0, 1, 2].map(i => (
                                        <div key={i} className="absolute inset-0" style={{ transform: `translate(-${i * 3}px, -${i * 3}px)` }}>
                                            <Card isFaceDown deckColor={i % 2 === 0 ? 'blue' : 'red'} className="w-full h-full shadow-lg" />
                                        </div>
                                    ))}

                                    {/* Flying Cards Animation */}
                                    {isDealing && Array.from({ length: 44 }).map((_, i) => {
                                        // Only render active or recently finished cards to save resources? 
                                        // Actually react handles this okay. 
                                        // We need to map logical player index to visual target.

                                        if (i > dealingCardIndex) return null;

                                        // Logical Player Index (0, 1, 2, 3)
                                        const logicalIdx = i % 4;

                                        // Map to Visual Position relative to Me
                                        // Me = Bottom. 
                                        let visualPos = 'TOP'; // Default

                                        const myIndex = state.players.findIndex(p => p.id === peerId);
                                        // If I am -1 (e.g. spectator/bug), default to naive map

                                        if (myIndex !== -1) {
                                            const rightIndex = (myIndex - 1 + 4) % 4;
                                            const leftIndex = (myIndex + 1) % 4;

                                            if (logicalIdx === myIndex) visualPos = 'BOTTOM';
                                            else if (logicalIdx === rightIndex) visualPos = 'RIGHT';
                                            else if (logicalIdx === leftIndex) visualPos = 'LEFT';
                                            else visualPos = 'TOP';
                                        } else {
                                            // Fallback
                                            const map = ['BOTTOM', 'RIGHT', 'TOP', 'LEFT'];
                                            visualPos = map[logicalIdx];
                                        }

                                        const targets: Record<string, { x: number, y: number }> = {
                                            'BOTTOM': { x: 0, y: 300 },
                                            'RIGHT': { x: 400, y: 0 },
                                            'TOP': { x: 0, y: -300 },
                                            'LEFT': { x: -400, y: 0 }
                                        };

                                        const target = targets[visualPos];

                                        return (
                                            <motion.div
                                                key={`deal-${i}`}
                                                initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                                                animate={{
                                                    x: target.x,
                                                    y: target.y,
                                                    scale: 0.67, // Shrink to match hand size (w-24 / w-36 approx 0.66)
                                                    opacity: [1, 1, 0],
                                                    transition: { duration: 0.5, ease: "easeInOut", times: [0, 0.9, 1] }
                                                }}
                                                className="absolute inset-0 z-50"
                                            >
                                                <Card isFaceDown deckColor={i % 2 === 0 ? 'blue' : 'red'} className="w-full h-full shadow-md" />
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>


                    {/* LEFT COLUMN: Enemy 1 (Left) */}
                    <div className="flex items-start justify-center max-md:justify-start max-md:items-center max-md:mt-0 max-md:col-start-1 max-md:row-start-1 max-md:pt-0 max-md:-translate-y-9">
                        {enemyLeft && (
                            <div className={`flex flex-col items-center gap-1 transition-all duration-300 ${enemyLeft.id === state.currentTurnPlayerId ? 'scale-110 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]' : ''}`}>
                                {/* Name Badge Above */}
                                <div className="bg-black/50 px-2 py-0.5 rounded-lg border border-white/20 backdrop-blur-sm max-md:scale-75 origin-bottom">
                                    <span className={`font-bold tracking-wide text-xs ${enemyLeft.id === state.currentTurnPlayerId ? 'text-yellow-400' : 'text-white'}`}>
                                        {enemyLeft.name.toUpperCase()}
                                    </span>
                                </div>

                                <div className="relative w-20 max-md:w-16 flex flex-col items-center h-[16rem] max-md:h-auto overflow-visible">
                                    <div className="relative w-full h-full flex flex-col items-center">
                                        {Array.from({ length: enemyLeft ? getVisibleCardCount(enemyLeft.id, enemyLeft.hand.length) : 0 }).map((_, i) => (
                                            <div key={i} className="absolute left-0 w-full flex justify-center md:hover:translate-x-2 transition-transform" style={{ top: `${i * (typeof window !== 'undefined' && window.innerWidth < 768 ? 25 : 15)}px`, height: '40px' }}>
                                                <Card isFaceDown deckColor={i % 2 === 0 ? 'red' : 'blue'} className="w-full h-16 shadow-md max-md:rotate-90 max-md:origin-center max-md:w-12 max-md:h-16 max-md:-translate-x-6" />
                                            </div>
                                        ))}
                                        {/* Spacer for flow if needed */}
                                        <div style={{ height: `${(enemyLeft?.hand.length || 0) * 15 + 64}px` }}></div>
                                    </div>
                                    <div className="absolute -bottom-2 md:bottom-[-12px] left-1/2 -translate-x-1/2 bg-yellow-500 text-black font-bold text-xs px-2 py-0.5 rounded-full border border-white shadow-lg z-20 scale-75">
                                        {enemyLeft.hand.length}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* CENTER COLUMN WRAPPER FOR MOBILE MELDS */}
                    <div className="contents max-md:flex max-md:flex-col max-md:col-start-2 max-md:gap-2 max-md:w-full max-md:h-full max-md:min-h-0">

                        {/* CENTER RIGHT/TOP: Enemy/Right Team Melds */}
                        <motion.div
                            initial={{ opacity: 1 }}
                            animate={{ opacity: isDealing ? 0 : 1 }}
                            transition={{ duration: 0.5 }}
                            className="bg-black/20 rounded-r-2xl max-md:rounded-xl border-l max-md:border border-white/20 p-4 max-md:p-2 relative flex flex-col pl-6 max-md:pl-2 max-md:w-full max-md:flex-1 max-md:min-h-[200px] md:h-full"
                        >
                            <div className={`text-xs font-black ${rightTeamId === 'A' ? 'text-blue-400' : 'text-red-400'} opacity-80 tracking-[0.2em] uppercase mb-2 text-right max-md:text-left`}>
                                {rightTeamId === 'A' ? (state.teams.A.name || t.teamA) : (state.teams.B.name || t.teamB)} {t.melds} {rightTeamId !== myTeamId ? `(${t.enemy})` : ''}
                            </div>
                            <div className="flex-1 flex flex-wrap content-start gap-1 max-md:gap-0 justify-end max-md:justify-start overflow-y-auto overflow-x-hidden min-h-[80px] md:pr-1 max-md:pr-1">
                                {(rightTeam?.melds || []).map(meld => (
                                    <div key={meld.id}
                                        id={`meld-drop-${meld.id}`}
                                        data-meld-id={meld.id}
                                        onClick={() => isMyTurn && myPlayer?.teamId === rightTeamId && toggleMeldSelect(meld.id)}
                                        className={`relative group transition-all cursor-pointer md:hover:scale-105 ${selectedMeldId === meld.id ? 'z-30' : 'z-10'}`}>
                                        <div className={`transition-all duration-200 scale-100 origin-top-left ${selectedMeldId === meld.id ? 'ring-4 ring-green-400 rounded-xl bg-white/10 shadow-[0_0_20px_rgba(74,222,128,0.4)]' : ''}`}>
                                            <div className={`flex ${isMobileViewport ? rightMeldOverlapClass : rightDesktopMeldOverlapClass} p-1`}>
                                                {meld.cards.map((c, idx) => (
                                                    <div key={c.id} className="relative shadow-md" style={{ zIndex: idx }}>
                                                        <Card card={c} className={`${isMobileViewport ? rightMeldCardClass : rightDesktopMeldCardClass} border border-black/20`} />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="absolute -bottom-2 -right-2 bg-black/70 text-[10px] font-bold text-white px-2 py-0.5 rounded-full border border-white/20 shadow-lg">
                                                {calculateMeldBonus(meld)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* CENTER LEFT/BOTTOM: My/Left Team Melds */}
                        <motion.div
                            initial={{ opacity: 1 }}
                            animate={{ opacity: isDealing ? 0 : 1 }}
                            transition={{ duration: 0.5 }}
                            className="bg-black/20 rounded-l-2xl max-md:rounded-xl border-r max-md:border border-white/20 p-4 max-md:p-2 relative flex flex-col max-md:w-full max-md:flex-1 max-md:min-h-[200px] md:h-full"
                        >
                            <div className={`text-xs font-black ${leftTeamId === 'A' ? 'text-blue-400' : 'text-red-400'} opacity-80 tracking-[0.2em] uppercase mb-2`}>
                                {leftTeamId === 'A' ? (state.teams.A.name || t.teamA) : (state.teams.B.name || t.teamB)} {t.melds} {leftTeamId === myTeamId ? `(${t.you})` : ''}
                            </div>
                            <div className="flex-1 flex flex-wrap content-start gap-1 max-md:gap-0 overflow-y-auto overflow-x-hidden min-h-[80px] md:pr-1 max-md:pr-1">
                                {(leftTeam?.melds || []).map(meld => (
                                    <div key={meld.id}
                                        id={`meld-drop-${meld.id}`}
                                        data-meld-id={meld.id}
                                        onClick={() => isMyTurn && myPlayer?.teamId === leftTeamId && toggleMeldSelect(meld.id)}
                                        className={`relative group transition-all cursor-pointer md:hover:scale-105 ${selectedMeldId === meld.id ? 'z-30' : 'z-10'}`}>
                                        <div className={`transition-all duration-200 scale-100 origin-top-left ${selectedMeldId === meld.id ? 'ring-4 ring-green-400 rounded-xl bg-white/10 shadow-[0_0_20px_rgba(74,222,128,0.4)]' : ''}`}>
                                            <div className={`flex ${isMobileViewport ? leftMeldOverlapClass : leftDesktopMeldOverlapClass} p-1`}>
                                                {meld.cards.map((c, idx) => (
                                                    <div key={c.id} className="relative shadow-md" style={{ zIndex: idx }}>
                                                        <Card card={c} className={`${isMobileViewport ? leftMeldCardClass : leftDesktopMeldCardClass} border border-black/20`} />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="absolute -bottom-2 -right-2 bg-black/70 text-[10px] font-bold text-white px-2 py-0.5 rounded-full border border-white/20 shadow-lg">
                                                {calculateMeldBonus(meld)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                    </div>

                    {/* RIGHT COLUMN: Enemy 2 (Right) */}
                    <div className="flex items-start justify-center max-md:justify-end max-md:items-center max-md:mt-0 max-md:col-start-3 max-md:row-start-1 max-md:pt-0 max-md:-translate-y-9">
                        {enemyRight && (
                            <div className={`flex flex-col items-center gap-1 transition-all duration-300 ${enemyRight.id === state.currentTurnPlayerId ? 'scale-110 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]' : ''}`}>
                                {/* Name Badge Above */}
                                <div className="bg-black/50 px-2 py-0.5 rounded-lg border border-white/20 backdrop-blur-sm max-md:scale-75 origin-bottom">
                                    <span className={`font-bold tracking-wide text-xs ${enemyRight.id === state.currentTurnPlayerId ? 'text-yellow-400' : 'text-white'}`}>
                                        {enemyRight.name.toUpperCase()}
                                    </span>
                                </div>

                                <div className="relative w-20 max-md:w-16 flex flex-col items-center h-[16rem] max-md:h-auto overflow-visible">
                                    <div className="relative w-full h-full flex flex-col items-center">
                                        {Array.from({ length: enemyRight ? getVisibleCardCount(enemyRight.id, enemyRight.hand.length) : 0 }).map((_, i) => (
                                            <div key={i} className="absolute right-0 w-full flex justify-center md:hover:-translate-x-2 transition-transform" style={{ top: `${i * (typeof window !== 'undefined' && window.innerWidth < 768 ? 25 : 15)}px`, height: '40px' }}>
                                                <Card isFaceDown deckColor={i % 2 === 0 ? 'red' : 'blue'} className="w-full h-16 shadow-md max-md:rotate-90 max-md:origin-center max-md:w-12 max-md:h-16 max-md:translate-x-6" />
                                            </div>
                                        ))}
                                        {/* Spacer for flow if needed */}
                                        <div style={{ height: `${(enemyRight?.hand.length || 0) * 15 + 64}px` }}></div>
                                    </div>
                                    <div className="absolute -bottom-2 md:bottom-[-12px] right-1/2 translate-x-1/2 bg-yellow-500 text-black font-bold text-xs px-2 py-0.5 rounded-full border border-white shadow-lg z-20 scale-75">
                                        {enemyRight.hand.length}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- BOTTOM ROW: Deck + Hand + Discard + Mour --- */}
                <div className="grid grid-cols-[12%_76%_12%] max-md:flex max-md:flex-col pt-2 max-md:pt-0 max-md:flex-none z-20 max-md:bg-gradient-to-t max-md:from-black/40 max-md:to-transparent gap-2 max-md:px-2">

                    {/* MOBILE ONLY: Control Row (Deck | Discard | Mour) */}
                    <div className="hidden max-md:grid max-md:grid-cols-[22%_56%_22%] max-md:w-full max-md:items-center max-md:gap-2 max-md:-mb-7 max-md:relative max-md:z-10">
                        {/* Deck Position */}
                        <div className="flex justify-start max-md:-translate-y-10">
                            {!isDealing && (
                                <motion.div
                                    layoutId="deck-container-mobile"
                                    className="relative group cursor-pointer active:scale-95"
                                    onClick={() => {
                                        if (isMyTurn && state.turnPhase === 'WAITING_FOR_DRAW' && peerId) {
                                            playSound(drawSound);
                                            actions.drawCard(peerId);
                                        }
                                    }}>
                                    <div className="relative w-14 h-[5rem]">
                                        {[0, 1, 2].map(i => (
                                            <div key={i} className="absolute inset-0" style={{ transform: `translate(-${i * 2}px, -${i * 2}px)` }}>
                                                <Card isFaceDown deckColor={state.deck.length % 2 === 0 ? 'blue' : 'red'} className="w-full h-full shadow-lg border border-white/10" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="absolute -top-4 w-full text-center font-bold text-blue-200 tracking-widest uppercase text-[10px]">{state.deck.length}</div>
                                </motion.div>
                            )}
                        </div>

                        {/* Discard Position */}
                        <div className="flex justify-center items-center h-full max-md:h-[5.25rem] max-md:items-start max-md:overflow-hidden"
                            onClick={() => {
                                if (isMyTurn && state.turnPhase === 'WAITING_FOR_DRAW' && peerId && state.discardPile.length > 0) {
                                    playSound(drawSound);
                                    actions.sweepPile(peerId);
                                }
                            }}>
                            {state.discardPile.length > 0 ? (
                                <div
                                    className="relative h-[7.75rem] flex items-center cursor-pointer group active:scale-95 bg-slate-300/20 px-2 py-1 rounded-lg border border-white/20 backdrop-blur-sm shadow-xl"
                                    style={isMobileViewport ? { width: `${mobileDiscardContainerPx}px` } : undefined}
                                >
                                    <div className="flex w-full py-0.5 justify-center overflow-hidden">
                                        {state.discardPile.map((card, index) => (
                                            <div key={card.id} className="relative flex-shrink-0" style={{ marginLeft: index === 0 ? 0 : -mobileDiscardOverlapPx }}>
                                                <Card
                                                    card={card}
                                                    className="shadow-lg brightness-90 border border-black/30"
                                                    disableLayout={true}
                                                    style={{ width: `${Math.round(mobileDiscardCardWidthPx)}px`, height: `${mobileDiscardCardHeightPx}px` }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="absolute -top-4 left-0 w-full text-center font-bold text-white/80 uppercase text-[10px] tracking-widest">{t.discard}</div>
                                </div>
                            ) : (
                                <div
                                    className="h-[7.75rem] bg-slate-300/10 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm"
                                    style={isMobileViewport ? { width: `${mobileDiscardContainerPx}px` } : undefined}
                                >
                                    <span className="text-white/40 font-bold tracking-widest text-[8px] uppercase">{t.discardEmpty}</span>
                                </div>
                            )}
                        </div>

                        {/* Mour Position */}
                        <div className="flex justify-end items-center max-md:-translate-y-10">
                            <div className="relative w-14 h-14 flex items-center justify-center">
                                {moursRemaining > 0 && (
                                    <div className="absolute z-0">
                                        <Card isFaceDown deckColor="red" className="w-14 h-20 shadow-lg border border-white/10" />
                                        <div className="absolute inset-0 flex items-center justify-center font-bold text-white/50 text-xl max-md:text-sm">11</div>
                                    </div>
                                )}
                                {moursRemaining > 1 && (
                                    <div className="absolute z-10 rotate-90">
                                        <Card isFaceDown deckColor="blue" className="w-14 h-20 shadow-lg border border-white/10" />
                                        <div className="absolute inset-0 flex items-center justify-center font-bold text-white/50 text-xl max-md:text-sm -rotate-90">11</div>
                                    </div>
                                )}
                                {moursRemaining === 0 && (
                                    <div className="text-white/20 text-xs font-bold uppercase tracking-widest border-2 border-white/10 border-dashed p-1 rounded-lg text-[8px]">
                                        Empty
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* DESKTOP ONLY: Original 3-col Grid Cell 1 (Left Deck) */}
                    <div className="flex items-start justify-center pt-8 max-md:hidden">
                        {!isDealing && (
                            <motion.div
                                layoutId="deck-container"
                                className="relative group cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => {
                                    if (isMyTurn && state.turnPhase === 'WAITING_FOR_DRAW' && peerId) {
                                        playSound(drawSound);
                                        actions.drawCard(peerId);
                                    }
                                }}>
                                {/* Deck Stack Visual (Using Real Cards) */}
                                <div className="relative w-28 h-[10.5rem] max-md:w-20 max-md:h-[7.5rem]">
                                    {[0, 1, 2].map(i => (
                                        <div key={i} className="absolute inset-0" style={{ transform: `translate(-${i * 3}px, -${i * 3}px)` }}>
                                            <Card isFaceDown deckColor={state.deck.length % 2 === 0 ? 'blue' : 'red'} className="w-full h-full shadow-lg" />
                                        </div>
                                    ))}
                                </div>
                                <div className="absolute -top-8 w-full text-center font-bold text-blue-200 tracking-widest uppercase text-sm">{t.deck} ({state.deck.length})</div>
                            </motion.div>
                        )}
                    </div>

                    {/* CENTER CELL: Hand + (on Desktop) Discard Top */}
                    <div className="relative flex flex-col justify-end items-center h-full max-md:w-full">

                        {/* DESKTOP ONLY: Discard Area (Spread Above Hand) */}
                        <div className="mb-4 w-full flex justify-center items-end max-md:hidden"
                            onClick={() => {
                                if (isMyTurn && state.turnPhase === 'WAITING_FOR_DRAW' && peerId && state.discardPile.length > 0) {
                                    playSound(drawSound);
                                    actions.sweepPile(peerId);
                                }
                            }}>
                            {state.discardPile.length > 0 ? (
                                <div className="relative h-[7.2rem] flex items-center cursor-pointer group hover:scale-105 transition-transform bg-slate-300/20 px-[4rem] py-2 rounded-2xl border border-white/20 backdrop-blur-sm shadow-xl">
                                    <div className="flex -space-x-8">
                                        {state.discardPile.slice(Math.max(0, state.discardPile.length - 8)).map((card) => (
                                            <div key={card.id} className="relative hover:-translate-y-4 transition-transform duration-200">
                                                <Card card={card} className="w-16 h-24 lg:w-20 lg:h-28 shadow-lg brightness-90 border border-black/30" disableLayout={true} />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="absolute -top-6 left-0 w-full text-center font-bold text-white/80 uppercase text-xs tracking-widest">{t.discard}</div>
                                </div>
                            ) : (
                                <div className="w-[15.6rem] h-[7.2rem] bg-slate-300/10 border-2 border-dashed border-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                                    <span className="text-white/40 font-bold tracking-widest text-xs uppercase">{t.discardEmpty}</span>
                                </div>
                            )}
                        </div>

                        {/* PLAYER HAND (Shared Desktop/Mobile but styled differently) */}
                        <div className="relative flex justify-center w-full z-20 pb-4 max-md:pb-1">
                            {/* Action Buttons (Floating) */}
                            <div className={`absolute -top-20 max-md:-top-16 flex gap-4 max-md:gap-1 transition-all duration-200 z-50 ${selectedCards.length > 0 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'}`}>
                                <button
                                    disabled={!isMyTurn}
                                    onClick={handleMeld}
                                    className="px-6 py-2 max-md:px-2 max-md:py-1 bg-gradient-to-t from-yellow-700 to-yellow-500 text-white font-black rounded-lg shadow-lg border border-yellow-300 hover:scale-105 active:scale-95 uppercase tracking-wider text-sm max-md:text-[10px]">
                                    {t.meldBtn}
                                </button>
                                <button
                                    disabled={!isMyTurn}
                                    onClick={handleAddToMeld}
                                    className="px-6 py-2 max-md:px-2 max-md:py-1 bg-gradient-to-t from-blue-700 to-blue-500 text-white font-black rounded-lg shadow-lg border border-blue-300 hover:scale-105 active:scale-95 uppercase tracking-wider text-sm max-md:text-[10px]">
                                    {t.addToMeld}
                                </button>
                                <button
                                    disabled={!isMyTurn}
                                    onClick={handleDiscard}
                                    className="px-6 py-2 max-md:px-2 max-md:py-1 bg-gradient-to-t from-red-700 to-red-500 text-white font-black rounded-lg shadow-lg border border-red-300 hover:scale-105 active:scale-95 uppercase tracking-wider text-sm max-md:text-[10px]">
                                    {t.discard}
                                </button>
                            </div>

                            {/* FIRST TURN CHOICE MODAL/OVERLAY */}
                            <AnimatePresence>
                                {showFirstTurnChoice && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 20 }}
                                        className="absolute -top-32 flex flex-col items-center gap-2 z-[100] bg-slate-900/90 p-4 rounded-xl border border-yellow-500/30 backdrop-blur-md shadow-2xl">
                                        <div className="text-yellow-400 font-bold text-xs uppercase tracking-widest mb-1">{t.yourTurn} (First Turn Special)</div>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handleFirstTurnChoice(true)}
                                                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-sm transition-all shadow-lg border border-red-400">
                                                {t.discardAndEnd}
                                            </button>
                                            <button
                                                onClick={() => handleFirstTurnChoice(false)}
                                                disabled={showFirstTurnChoice.cardId !== state.lastDrawnCardId}
                                                className={`px-4 py-2 font-bold rounded-lg text-sm transition-all shadow-lg border ${showFirstTurnChoice.cardId === state.lastDrawnCardId ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400' : 'bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed opacity-50'}`}>
                                                {t.discardAndDraw}
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => setShowFirstTurnChoice(null)}
                                            className="text-[10px] text-slate-400 hover:text-white mt-1 uppercase">
                                            {t.back}
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* PLAYER NAME / TURN INDICATOR */}
                            <div className={`hidden absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center z-30 max-md:hidden`}>
                                <div className={`px-2 py-0 rounded-full backdrop-blur-sm border transition-all ${isMyTurn ? 'bg-yellow-500/20 border-yellow-500' : 'bg-black/40 border-white/5'}`}>
                                    <span className={`font-bold tracking-wider text-[9px] uppercase ${isMyTurn ? 'text-yellow-400' : 'text-white/40'}`}>
                                        {t.you} • {myPlayer?.name.toUpperCase()}
                                    </span>
                                </div>
                            </div>

                            {myPlayer && (() => {
                                const visibleHand = handCards.slice(0, getVisibleCardCount(myPlayer.id, handCards.length));
                                const cardCount = visibleHand.length;

                                // Dynamic variables for sizing and spacing
                                const isMobile = viewportWidth < 768;
                                let cardWidth = "w-32";
                                let cardHeight = "h-48";
                                let spacingClass = "-space-x-12";
                                let cardStyle: CSSProperties | undefined;
                                let overlapPx = 0;
                                let mobileHandVisibleHeightPx: number | undefined;

                                // Mobile: fit hand to current viewport width
                                if (isMobile) {
                                    const horizontalPadding = 16; // include small border/safe gutter
                                    const maxCardWidth = 112; // keep cards readable on phones
                                    const overlapRatio = cardCount > 18 ? 0.75 : cardCount > 14 ? 0.72 : 0.7;
                                    const stepRatio = 1 - overlapRatio;
                                    const available = Math.max(1, viewportWidth - horizontalPadding);
                                    const denom = 1 + Math.max(0, cardCount - 1) * stepRatio;
                                    const computedWidth = available / Math.max(1, denom);
                                    const cardWidthPx = Math.min(maxCardWidth, computedWidth);
                                    const cardHeightPx = Math.round(cardWidthPx * 1.43);
                                    overlapPx = Math.round(cardWidthPx * overlapRatio);
                                    cardStyle = { width: `${Math.round(cardWidthPx)}px`, height: `${cardHeightPx}px` };
                                    spacingClass = "";
                                    mobileHandVisibleHeightPx = Math.round(cardHeightPx * 0.67) + 14;
                                } else if (cardCount > 18) {
                                    cardWidth = "w-20";
                                    cardHeight = "h-32";
                                    spacingClass = "-space-x-8";
                                } else if (cardCount > 12) {
                                    cardWidth = "w-24";
                                    cardHeight = "h-36";
                                    spacingClass = "-space-x-10";
                                }

                                return (
                                    <div
                                        className="w-full flex justify-center max-md:overflow-x-hidden max-md:overflow-y-hidden max-md:pb-1 max-md:pt-1 no-scrollbar max-md:relative max-md:z-20"
                                        style={{
                                            WebkitOverflowScrolling: 'touch',
                                            ...(isMobile && mobileHandVisibleHeightPx ? { height: `${mobileHandVisibleHeightPx}px` } : {})
                                        }}
                                    >
                                        <Reorder.Group
                                            axis="x"
                                            values={visibleHand}
                                            onReorder={(newOrder) => { if (peerId) actions.reorderHand(peerId, newOrder); }}
                                            className={`flex ${spacingClass} flex-nowrap rounded-lg border ${isMyTurn && selectedCards.length === 0 ? 'border-yellow-200 shadow-[0_0_32px_rgba(250,204,21,0.72)]' : 'border-white/10'}`}
                                        >
                                            <AnimatePresence initial={false}>
                                                {visibleHand.map((card, index) => (
                                                    <Reorder.Item key={card.id} value={card}
                                                        initial={{ opacity: 0, scale: 0.5, x: -400, y: -30, rotate: -15, zIndex: 50 }}
                                                        animate={{
                                                            opacity: 1,
                                                            scale: 1,
                                                            x: 0,
                                                            y: 0,
                                                            rotate: 0,
                                                            transition: { type: "spring", stiffness: 90, damping: 22 }
                                                        }}
                                                        style={{
                                                            ...(isMobile && overlapPx > 0 ? { marginLeft: index === 0 ? 2 : -overlapPx } : {}),
                                                            zIndex: index + 1
                                                        }}
                                                        onAnimationComplete={() => { }}
                                                        whileDrag={{ scale: 1.1, zIndex: 100, boxShadow: "0px 10px 20px rgba(0,0,0,0.5)" }}
                                                        onDragEnd={(_event, info) => {
                                                            const dropTarget = document.elementFromPoint(info.point.x, info.point.y);
                                                            const meldContainer = dropTarget?.closest('[data-meld-id]');
                                                            if (meldContainer && isMyTurn && state.turnPhase === 'PLAYING' && peerId) {
                                                                const meldId = meldContainer.getAttribute('data-meld-id');
                                                                if (meldId) {
                                                                    actions.addToMeld(peerId, meldId, [card]);
                                                                }
                                                            }
                                                        }}
                                                        className="relative flex-shrink-0"
                                                    >
                                                        <div className="hover:-translate-y-10 transition-transform duration-200 origin-bottom hover:z-20 relative">
                                                            <Card card={card}
                                                                isSelected={selectedCards.includes(card.id)}
                                                                onClick={() => toggleSelect(card.id)}
                                                                disableLayout={true}
                                                                disableHover={true}
                                                                className={`${isMobile ? '' : `${cardWidth} ${cardHeight}`} shadow-2xl border border-black/20`}
                                                                style={cardStyle} />
                                                        </div>
                                                    </Reorder.Item>
                                                ))}
                                            </AnimatePresence>
                                        </Reorder.Group>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* DESKTOP ONLY: Original 3-col Grid Cell 3 (Right Mour) */}
                    <div className="flex flex-col items-center justify-start pt-8 max-md:hidden opacity-90">
                        {/* Two distinct decks stacked: one vertical, one horizontal */}
                        <div className="relative w-36 h-36 flex items-center justify-center">
                            {/* Pile 1: Vertical (Only if at least 1 mour left) */}
                            {moursRemaining > 0 && (
                                <div className="absolute transition-transform hover:scale-110 z-0">
                                    <Card isFaceDown deckColor="red" className="w-24 h-36 max-md:w-14 max-md:h-20 shadow-lg border border-white/10" />
                                    <div className="absolute inset-0 flex items-center justify-center font-bold text-white/50 text-xl max-md:text-sm">11</div>
                                </div>
                            )}
                            {/* Pile 2: Horizontal (Only if 2 mours left) */}
                            {moursRemaining > 1 && (
                                <div className="absolute transition-transform hover:scale-110 z-10 rotate-90">
                                    <Card isFaceDown deckColor="blue" className="w-24 h-36 max-md:w-14 max-md:h-20 shadow-lg border border-white/10" />
                                    <div className="absolute inset-0 flex items-center justify-center font-bold text-white/50 text-xl max-md:text-sm -rotate-90">11</div>
                                </div>
                            )}
                            {moursRemaining === 0 && (
                                <div className="text-white/20 text-xs font-bold uppercase tracking-widest border-2 border-white/10 border-dashed p-1 rounded-lg text-[8px]">
                                    Empty
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div >
            {renderSettingsModal()}
        </div >
    );
}
