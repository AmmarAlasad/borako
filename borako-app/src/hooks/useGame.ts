import { useReducer, useMemo, useEffect, useRef, useState } from 'react';
import { gameReducer, INITIAL_STATE } from '../engine/reducer';
import type { Card } from '../engine/types';
import { connection, type Message } from '../network/connection';

const SESSION_STORAGE_KEY = 'borako_session_v1';

type PersistedSession = {
    state: typeof INITIAL_STATE;
    peerId: string | null;
    isConnected: boolean;
    hostId: string | null;
};

function loadPersistedSession(): PersistedSession | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as PersistedSession;
        if (!parsed || !parsed.state) return null;
        return parsed;
    } catch {
        return null;
    }
}

function clearPersistedSession() {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

export function useGame() {
    const restored = loadPersistedSession();
    const [state, dispatch] = useReducer(gameReducer, restored?.state || INITIAL_STATE);
    const [peerId, setPeerId] = useState<string | null>(restored?.peerId ?? null);
    const [isConnected, setIsConnected] = useState(restored?.isConnected ?? false);
    const [hostId, setHostId] = useState<string | null>(restored?.hostId ?? null);
    const stateRef = useRef(state);
    const peerIdRef = useRef(peerId);
    const hostIdRef = useRef(hostId);

    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    useEffect(() => {
        peerIdRef.current = peerId;
    }, [peerId]);

    useEffect(() => {
        hostIdRef.current = hostId;
    }, [hostId]);

    // Re-initialize networking on refresh so user can continue without rejoining manually.
    useEffect(() => {
        if (!peerId) return;
        let cancelled = false;
        const me = state.players.find(p => p.id === peerId);
        const isRestoredHost = !!me?.isHost;

        (async () => {
            try {
                await connection.initialize(peerId);
                if (cancelled) return;

                if (!isRestoredHost && hostId) {
                    await connection.connect(hostId);
                }
                if (!cancelled) setIsConnected(true);
            } catch {
                // If reconnection fails, keep local session state visible and allow manual retry.
                if (!cancelled) setIsConnected(false);
            }
        })();

        return () => {
            cancelled = true;
        };
        // Intentionally run once from restored values only.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Persist active session
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const payload: PersistedSession = {
            state,
            peerId,
            isConnected,
            hostId
        };
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
    }, [state, peerId, isConnected, hostId]);

    // Networking Effect
    useEffect(() => {
        // Handler for incoming messages
        connection.setMessageHandler((msg: Message) => {
            if (msg.type === 'STATE_UPDATE') {
                dispatch({ type: 'SYNC_STATE', payload: msg.payload });
            } else if (msg.type === 'ACTION') {
                // Only Host processes Actions
                if (stateRef.current.players.find(p => p.isHost)?.id === connection.getId()) {
                    dispatch(msg.payload);
                }
            }
        });

        connection.setConnectionHandler((connectedPeerId: string) => {
            const me = peerIdRef.current;
            const currentState = stateRef.current;
            const isCurrentHost = currentState.players.find(p => p.isHost)?.id === me;

            // If I am Host and someone (re)connects, broadcast current state to everyone (including them)
            if (isCurrentHost) {
                console.log("New peer connected, broadcasting state:", connectedPeerId);
                connection.broadcast({ type: 'STATE_UPDATE', payload: currentState });
            }
        });

        connection.setDisconnectHandler((disconnectedPeerId: string) => {
            const me = peerIdRef.current;
            const currentState = stateRef.current;
            const isCurrentHost = currentState.players.find(p => p.isHost)?.id === me;

            if (isCurrentHost) {
                // Grace period: Wait 2 seconds to see if they reconnect (refresh)
                // If they are STILL not connected after 2s, THEN remove them.
                setTimeout(() => {
                    if (!connection.isConnected(disconnectedPeerId)) {
                        console.log("Player permanently left:", disconnectedPeerId);
                        dispatch({ type: 'PLAYER_LEFT', payload: { playerId: disconnectedPeerId } });
                    } else {
                        console.log("Player reconnected during grace period:", disconnectedPeerId);
                    }
                }, 2000);
                return;
            }

            if (disconnectedPeerId === hostIdRef.current) {
                clearPersistedSession();
                setIsConnected(false);
                setHostId(null);
                dispatch({
                    type: 'HOST_DISCONNECTED',
                    payload: { message: 'Host left the game. Match was reset.' }
                });
            }
        });
    }, []);

    // Broadcast State Change (Host Only)
    useEffect(() => {
        if (state.players.length > 0) {
            const host = state.players.find(p => p.isHost);
            // If I am Host, broadcast state
            if (host && host.id === peerId) {
                connection.broadcast({ type: 'STATE_UPDATE', payload: state });
            }
        }
    }, [state, peerId]);

    const actions = useMemo(() => ({
        initGame: async (hostName: string, teamNames?: { A: string, B: string }) => {
            const id = await connection.initialize();
            setPeerId(id);
            setHostId(id);
            setIsConnected(true);
            dispatch({
                type: 'INIT_GAME',
                payload: {
                    hostName,
                    playerId: id,
                    teamAName: teamNames?.A,
                    teamBName: teamNames?.B
                }
            });
        },
        retryConnection: async () => {
            // Force re-init (attempt to get online ID)
            const id = await connection.initialize();
            setPeerId(id);

            // Simplest fix: Re-dispatch INIT_GAME with new ID, keeping old name.
            const hostPlayer = state.players.find(p => p.isHost);
            if (hostPlayer) {
                dispatch({ type: 'INIT_GAME', payload: { hostName: hostPlayer.name, playerId: id } });
            }
        },
        joinGame: async (hostId: string, name: string) => {
            const myId = await connection.initialize();
            setPeerId(myId);
            setHostId(hostId);

            await connection.connect(hostId);
            setIsConnected(true);

            connection.sendToHost({
                type: 'ACTION',
                payload: { type: 'JOIN_GAME', payload: { playerId: myId, name } }
            });
        },
        addBot: (name: string) => {
            const botId = `bot-${Math.random().toString(36).substr(2, 9)}`;
            dispatch({ type: 'JOIN_GAME', payload: { playerId: botId, name } });
        },
        kickPlayer: (playerId: string) => {
            handleAction({ type: 'KICK_PLAYER', payload: { playerId } });
        },
        switchTeam: (playerId: string) => {
            handleAction({ type: 'SWITCH_TEAM', payload: { playerId } });
        },
        startGame: () => {
            if (isHost()) dispatch({ type: 'START_GAME' });
        },
        drawCard: (playerId: string) => {
            handleAction({ type: 'DRAW_CARD', payload: { playerId } });
        },
        sweepPile: (playerId: string) => {
            handleAction({ type: 'SWEEP_PILE', payload: { playerId } });
        },
        meldCards: (playerId: string, cards: Card[]) => {
            handleAction({ type: 'MELD_CARDS', payload: { playerId, cards } });
        },
        discardCard: (playerId: string, cardId: string, endFirstTurn?: boolean) => {
            handleAction({ type: 'DISCARD_CARD', payload: { playerId, cardId, endFirstTurn } });
        },
        reorderHand: (playerId: string, newOrder: Card[]) => {
            // OPTIMISTIC UPDATE: Dispatch immediately to avoid UI glitch for clients
            if (playerId === peerId && !isHost()) {
                dispatch({ type: 'REORDER_HAND', payload: { playerId, newOrder } });
            }
            handleAction({ type: 'REORDER_HAND', payload: { playerId, newOrder } });
        },
        addToMeld: (playerId: string, meldId: string, cards: Card[]) => {
            handleAction({ type: 'ADD_TO_MELD', payload: { playerId, meldId, cards } });
        },
        nextRound: () => {
            if (isHost()) dispatch({ type: 'NEXT_ROUND' });
        },
        resetGame: () => {
            if (isHost()) dispatch({ type: 'RESET_GAME' });
        },
        leaveGame: () => {
            const me = peerIdRef.current;
            if (!me) return;

            const currentState = stateRef.current;
            const iAmHost = currentState.players.find(p => p.isHost)?.id === me;

            if (iAmHost) {
                const nextState = gameReducer(currentState, { type: 'PLAYER_LEFT', payload: { playerId: me } });
                connection.broadcast({ type: 'STATE_UPDATE', payload: nextState });
                dispatch({ type: 'SYNC_STATE', payload: nextState });
            } else {
                connection.sendToHost({
                    type: 'ACTION',
                    payload: { type: 'PLAYER_LEFT', payload: { playerId: me } }
                });
            }

            clearPersistedSession();
            setIsConnected(false);
            setHostId(null);
            connection.destroy();
            dispatch({
                type: 'HOST_DISCONNECTED',
                payload: { message: 'You left the game.' }
            });
        },
    }), [dispatch, peerId, state.players]);

    // Helper to check if I am Host
    const isHost = () => {
        const hostPlayer = state.players.find(p => p.isHost);
        return hostPlayer?.id === peerId;
    };

    const handleAction = (action: any) => {
        // If I am Host: Dispatch locally. Broadcast happens via useEffect.
        // If I am Client: Send 'ACTION' to Host.

        if (state.players.length === 0) {
            // Edge case: Initial setup or debug
            dispatch(action);
            return;
        }

        if (isHost()) {
            dispatch(action);
        } else {
            console.log("Sending action to Host:", action);
            connection.sendToHost({ type: 'ACTION', payload: action });
        }
    };

    return { state, dispatch, actions, peerId, isConnected };
}
