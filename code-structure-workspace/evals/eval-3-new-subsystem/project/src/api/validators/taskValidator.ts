export function validateCreateTask(body: any) {
  if (!body.title) throw new Error('title required');
  if (!body.projectId) throw new Error('projectId required');
}
