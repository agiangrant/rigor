import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { Server } from 'http';

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  rooms: Set<string>;
}

export class WsServer {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, ConnectedClient> = new Map();
  private rooms: Map<string, Set<WebSocket>> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
  }

  onConnection(handler: (client: ConnectedClient, message: any) => void): void {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const userId = this.extractUserId(req);
      if (!userId) {
        ws.close(4001, 'Unauthorized');
        return;
      }

      const client: ConnectedClient = { ws, userId, rooms: new Set() };
      this.clients.set(ws, client);

      ws.on('message', (raw: Buffer) => {
        try {
          const message = JSON.parse(raw.toString());
          handler(client, message);
        } catch {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        for (const room of client.rooms) {
          this.leaveRoom(ws, room);
        }
        this.clients.delete(ws);
      });

      ws.send(JSON.stringify({ type: 'connected', userId }));
    });
  }

  joinRoom(ws: WebSocket, room: string): void {
    const client = this.clients.get(ws);
    if (!client) return;

    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)!.add(ws);
    client.rooms.add(room);
  }

  leaveRoom(ws: WebSocket, room: string): void {
    const client = this.clients.get(ws);
    if (!client) return;

    this.rooms.get(room)?.delete(ws);
    if (this.rooms.get(room)?.size === 0) {
      this.rooms.delete(room);
    }
    client.rooms.delete(room);
  }

  broadcastToRoom(room: string, data: any, excludeWs?: WebSocket): void {
    const members = this.rooms.get(room);
    if (!members) return;

    const payload = JSON.stringify(data);
    for (const ws of members) {
      if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }

  private extractUserId(req: IncomingMessage): string | null {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    return url.searchParams.get('userId');
  }
}

let wsServerInstance: WsServer | null = null;

export function initWsServer(server: Server): WsServer {
  wsServerInstance = new WsServer(server);
  return wsServerInstance;
}

export function getWsServer(): WsServer {
  if (!wsServerInstance) throw new Error('WsServer not initialized');
  return wsServerInstance;
}
