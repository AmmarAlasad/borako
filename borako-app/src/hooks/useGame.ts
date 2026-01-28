import { useReducer, useMemo, useEffect, useState } from 'react';
import { gameReducer, INITIAL_STATE } from '../engine/reducer';
import type { Card } from '../engine/types';
import { connection, type Message } from '../network/connection';

export function useGame() {
    const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE);
    const [peerId, setPeerId] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // Networking Effect
    useEffect(() => {
        // Handler for incoming messages
        connection.setMessageHandler((msg: Message) => {
            if (msg.type === 'STATE_UPDATE') {
                dispatch({ type: 'SYNC_STATE', payload: msg.payload });
            } else if (msg.type === 'ACTION') {
                // Only Host processes Actions
                if (state.players.find(p => p.isHost)?.id === connection.getId()) {
                    dispatch(msg.payload);
                }
            }
        });

        // Cleanup?
        // connection.destroy(); // Only on unmount usually.
    }, [state]); // Re-attach when state changes? No, handler should be stable.

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
