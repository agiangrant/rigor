import { Task } from '../models/task';
import { TaskEvent } from '../models/taskEvent';
import { getWsServer } from '../../infrastructure/websocket/wsServer';

export class TaskNotificationService {
  static notifyTaskCreated(task: Task, actorId: string): void {
    const event: TaskEvent = {
      type: 'task:created',
      task,
      timestamp: new Date().toISOString(),
      actorId,
    };
    getWsServer().broadcastToRoom(`project:${task.projectId}`, event);
  }

  static notifyTaskUpdated(task: Task, actorId: string): void {
    const event: TaskEvent = {
      type: 'task:updated',
      task,
      timestamp: new Date().toISOString(),
      actorId,
    };
    getWsServer().broadcastToRoom(`project:${task.projectId}`, event);
  }
}
