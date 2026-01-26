import { Peer, type DataConnection } from 'peerjs';

export type Message =
    | { type: 'STATE_UPDATE'; payload: any }
    | { type: 'ACTION'; payload: any };

type MessageCallback = (msg: Message) => void;

class ConnectionManager {
    private peer: Peer | null = null;
    private connections: DataConnection[] = []; // For Host: list of clients. For Client: valid connection to host.
    private onMessage: MessageCallback | null = null;
    private myId: string = '';

    initialize(id?: string): Promise<string> {
        return new Promise((resolve, reject) => {
            if (this.peer) {
                this.peer.destroy();
            }

            const options = {
                // debug: 2,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' }
                    ]
                }
            };

            this.peer = id ? new Peer(id, options) : new Peer(options);

            this.peer.on('open', (peerId) => {
                console.log('My Peer ID:', peerId);
                this.myId = peerId;
                resolve(peerId);
            });

            this.peer.on('connection', (conn) => {
                console.log('Incoming connection from:', conn.peer);
                this.handleConnection(conn);
            });

            this.peer.on('error', (err) => {
                console.error("Peer Error:", err);
                // Only reject if we haven't resolved yet (not perfect check but helps)
                if (!this.myId) reject(err);
            });
        });
    }

    connect(hostId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.peer) {
                this.initialize().then(() => this.connect(hostId));
                return;
            }

            const timeout = setTimeout(() => {
                reject(new Error("Connection timed out"));
            }, 5000);

            const conn = this.peer.connect(hostId);
            conn.on('open', () => {
                clearTimeout(timeout);
                console.log("Connected to Host:", hostId);
                this.handleConnection(conn);
                resolve();
            });
            conn.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }

    private handleConnection(conn: DataConnection) {
        this.connections.push(conn);

        conn.on('data', (data: any) => {
            if (this.onMessage) {
                this.onMessage(data as Message);
            }
        });

        conn.on('close', () => {
            console.log("Connection closed:", conn.peer);
            this.connections = this.connections.filter(c => c !== conn);
        });
    }

    setMessageHandler(callback: MessageCallback) {
        this.onMessage = callback;
    }

    broadcast(msg: Message) {
        this.connections.forEach(conn => {
            if (conn.open) conn.send(msg);
        });
    }

    sendToHost(msg: Message) {
        // Logic same as broadcast if we only have 1 connection (Client -> Host)
        this.broadcast(msg);
    }

    destroy() {
        this.peer?.destroy();
        this.connections = [];
    }

    getId() {
        return this.myId;
    }
}

export const connection = new ConnectionManager();
