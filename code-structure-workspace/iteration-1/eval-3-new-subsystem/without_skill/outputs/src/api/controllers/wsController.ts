import { WsServer } from '../../infrastructure/websocket/wsServer';

export class WsController {
  static register(wsServer: WsServer): void {
    wsServer.onConnection((client, message) => {
      switch (message.type) {
        case 'join:project':
          if (message.projectId) {
            wsServer.joinRoom(client.ws, `project:${message.projectId}`);
            client.ws.send(JSON.stringify({
              type: 'joined',
              room: `project:${message.projectId}`,
            }));
          }
          break;

        case 'leave:project':
          if (message.projectId) {
            wsServer.leaveRoom(client.ws, `project:${message.projectId}`);
            client.ws.send(JSON.stringify({
              type: 'left',
              room: `project:${message.projectId}`,
            }));
          }
          break;

        default:
          client.ws.send(JSON.stringify({
            type: 'error',
            message: `Unknown message type: ${message.type}`,
          }));
      }
    });
  }
}
