import { ProjectService } from '../../domain/services/projectService';

export class ProjectController {
  static async list(req: any, res: any) {
    const projects = await ProjectService.list(req.user.id);
    res.json(projects);
  }
  static async create(req: any, res: any) {
    const project = await ProjectService.create(req.user.id, req.body);
    res.status(201).json(project);
  }
}
