import { Peer, type DataConnection } from 'peerjs';

export type Message =
    | { type: 'STATE_UPDATE'; payload: any }
    | { type: 'ACTION'; payload: any };

type MessageCallback = (msg: Message) => void;
type DisconnectCallback = (peerId: string) => void;
type ConnectionCallback = (peerId: string) => void;

class ConnectionManager {
    private peer: Peer | null = null;
    private connections: DataConnection[] = [];
    private onMessage: MessageCallback | null = null;
    private onDisconnect: DisconnectCallback | null = null;
    private onConnection: ConnectionCallback | null = null;
    private myId: string = '';
    private pendingConnectReject: ((err: Error) => void) | null = null;

    initialize(id?: string): Promise<string> {
        return new Promise((resolve, reject) => {
            if (this.peer) {
                this.peer.destroy();
            }
            this.myId = '';

            // Minimal, proven cross-browser config
            const peer = id ? new Peer(id, {
                debug: 2,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' },
                        {
                            urls: 'turn:openrelay.metered.ca:80',
                            username: 'openrelayproject',
                            credential: 'openrelayproject'
                        },
                        {
                            urls: 'turn:openrelay.metered.ca:443',
                            username: 'openrelayproject',
                            credential: 'openrelayproject'
                        },
                        {
                            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                            username: 'openrelayproject',
                            credential: 'openrelayproject'
                        }
                    ]
                }
            }) : new Peer({
                debug: 2,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' },
                        {
                            urls: 'turn:openrelay.metered.ca:80',
                            username: 'openrelayproject',
                            credential: 'openrelayproject'
                        },
                        {
                            urls: 'turn:openrelay.metered.ca:443',
                            username: 'openrelayproject',
                            credential: 'openrelayproject'
                        },
                        {
                            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                            username: 'openrelayproject',
                            credential: 'openrelayproject'
                        }
                    ]
                }
            });

            this.peer = peer;

            peer.on('open', (peerId) => {
                console.log('[PeerJS] ✓ Connected to signaling server, My ID:', peerId);
                this.myId = peerId;
                resolve(peerId);
            });

            peer.on('connection', (conn) => {
                console.log('[PeerJS] ✓ Incoming data connection from:', conn.peer);
                this.handleConnection(conn);
            });

            peer.on('disconnected', () => {
                console.warn('[PeerJS] ⚠ Lost signaling server. Reconnecting...');
                if (peer && !peer.destroyed) {
                    peer.reconnect();
                }
            });

            peer.on('error', (err: any) => {
                console.error('[PeerJS] ✗ Error:', err.type, '-', err.message || err);

                // peer-unavailable = host ID not found on signaling server
                if (err.type === 'peer-unavailable') {
                    if (this.pendingConnectReject) {
                        this.pendingConnectReject(new Error('Host not found. Check the Room Code.'));
                        this.pendingConnectReject = null;
                    }
                    return;
                }

                // Only reject initialize promise if we haven't opened yet
                if (!this.myId) reject(err);
            });

            peer.on('close', () => {
                console.log('[PeerJS] Peer closed');
            });
        });
    }

    async connect(hostId: string, retryCount = 0): Promise<void> {
        const MAX_RETRIES = 2;

        try {
            // Make sure we have a live peer
            if (!this.peer || this.peer.destroyed) {
                await this.initialize();
            } else if (this.peer.disconnected) {
                console.log('[PeerJS] Peer is disconnected, reconnecting before connect...');
                this.peer.reconnect();
                // Wait up to 5s for it to reconnect
                await new Promise<void>((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Reconnect timeout')), 5000);
                    const check = setInterval(() => {
                        if (this.peer && !this.peer.disconnected && this.myId) {
                            clearInterval(check);
                            clearTimeout(timeout);
                            resolve();
                        }
                    }, 200);
                });
            }

            console.log(`[PeerJS] Connecting to host: ${hostId} (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);

            return await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    this.pendingConnectReject = null;
                    reject(new Error('Connection timed out after 12s'));
                }, 12000);

                // Forward peer-unavailable errors
                this.pendingConnectReject = (err) => {
                    clearTimeout(timeout);
                    reject(err);
                };

                const conn = this.peer!.connect(hostId);

                conn.on('open', () => {
                    clearTimeout(timeout);
                    this.pendingConnectReject = null;
                    console.log('[PeerJS] ✓ Data channel open to host:', hostId);
                    this.handleConnection(conn);
                    resolve();
                });

                conn.on('error', (err) => {
                    clearTimeout(timeout);
                    this.pendingConnectReject = null;
                    console.error('[PeerJS] ✗ Connection error:', err);
                    reject(err);
                });
            });
        } catch (err) {
            if (retryCount < MAX_RETRIES) {
                console.warn(`[PeerJS] Attempt ${retryCount + 1} failed. Retrying in 2s...`);
                await new Promise(r => setTimeout(r, 2000));
                return this.connect(hostId, retryCount + 1);
            }
            throw err;
        }
    }

    private handleConnection(conn: DataConnection) {
        this.connections.push(conn);

        if (this.onConnection) {
            this.onConnection(conn.peer);
        }

        conn.on('data', (data: any) => {
            if (this.onMessage) {
                this.onMessage(data as Message);
            }
        });

        conn.on('close', () => {
            console.log('[PeerJS] Connection closed:', conn.peer);
            this.connections = this.connections.filter(c => c !== conn);

            const stillConnected = this.connections.some(c => c.peer === conn.peer);
            if (this.onDisconnect && !stillConnected) {
                this.onDisconnect(conn.peer);
            }
        });
    }

    setMessageHandler(callback: MessageCallback) {
        this.onMessage = callback;
    }

    setDisconnectHandler(callback: DisconnectCallback) {
        this.onDisconnect = callback;
    }

    setConnectionHandler(callback: ConnectionCallback) {
        this.onConnection = callback;
    }

    broadcast(msg: Message) {
        this.connections.forEach(conn => {
            if (conn.open) conn.send(msg);
        });
    }

    sendToHost(msg: Message) {
        this.broadcast(msg);
    }

    destroy() {
        this.peer?.destroy();
        this.connections = [];
        this.myId = '';
    }

    getId() {
        return this.myId;
    }

    isConnected(peerId: string) {
        return this.connections.some(c => c.peer === peerId && c.open);
    }
}

export const connection = new ConnectionManager();
