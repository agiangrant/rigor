import { TaskService } from '../../domain/services/taskService';

export class TaskController {
  static async list(req: any, res: any) {
    const tasks = await TaskService.list(req.user.id);
    res.json(tasks);
  }
  static async create(req: any, res: any) {
    const task = await TaskService.create(req.user.id, req.body);
    res.status(201).json(task);
  }
  static async update(req: any, res: any) {
    const task = await TaskService.update(req.params.id, req.body);
    res.json(task);
  }
}
