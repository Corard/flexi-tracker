import Peer from "peerjs";
import type { DataConnection } from "peerjs";
import type { SyncMessage } from "./sync-protocol";

export interface PeerConnectionEvents {
  onOpen: (id: string) => void;
  onConnection: (conn: DataConnection) => void;
  onData: (data: SyncMessage, conn: DataConnection) => void;
  onClose: () => void;
  onError: (error: Error) => void;
}

export class PeerConnectionManager {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private events: Partial<PeerConnectionEvents> = {};

  async createPeer(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.peer = new Peer();

      this.peer.on("open", (id) => {
        this.events.onOpen?.(id);
        resolve(id);
      });

      this.peer.on("connection", (conn) => {
        this.setupConnection(conn);
        this.events.onConnection?.(conn);
      });

      this.peer.on("error", (err) => {
        this.events.onError?.(err);
        reject(err);
      });

      this.peer.on("close", () => {
        this.events.onClose?.();
      });
    });
  }

  async connectToPeer(peerId: string): Promise<DataConnection> {
    if (!this.peer) {
      await this.createPeer();
    }

    return new Promise((resolve, reject) => {
      const conn = this.peer!.connect(peerId, { reliable: true });

      conn.on("open", () => {
        this.setupConnection(conn);
        resolve(conn);
      });

      conn.on("error", (err) => {
        reject(err);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!conn.open) {
          reject(new Error("Connection timeout"));
        }
      }, 10000);
    });
  }

  private setupConnection(conn: DataConnection) {
    this.connections.set(conn.peer, conn);

    conn.on("data", (data) => {
      this.events.onData?.(data as SyncMessage, conn);
    });

    conn.on("close", () => {
      this.connections.delete(conn.peer);
    });

    conn.on("error", (err) => {
      this.events.onError?.(err);
    });
  }

  sendData(conn: DataConnection, data: SyncMessage) {
    if (conn.open) {
      conn.send(data);
    }
  }

  on<K extends keyof PeerConnectionEvents>(event: K, handler: PeerConnectionEvents[K]) {
    this.events[event] = handler;
  }

  getPeerId(): string | null {
    return this.peer?.id ?? null;
  }

  getConnection(peerId: string): DataConnection | undefined {
    return this.connections.get(peerId);
  }

  closeConnection(conn: DataConnection) {
    conn.close();
    this.connections.delete(conn.peer);
  }

  destroy() {
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    this.peer?.destroy();
    this.peer = null;
  }
}
