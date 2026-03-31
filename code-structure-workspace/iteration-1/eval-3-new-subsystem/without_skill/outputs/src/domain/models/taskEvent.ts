import { Task } from './task';

export type TaskEventType = 'task:created' | 'task:updated';

export interface TaskEvent {
  type: TaskEventType;
  task: Task;
  timestamp: string;
  actorId: string;
}
