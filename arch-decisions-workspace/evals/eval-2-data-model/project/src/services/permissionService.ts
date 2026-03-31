import { db } from '../db';

// Current permission system: simple role-based
// Users are either 'admin' or 'member' within their organization
// Admins can do everything, members can only read

export class PermissionService {
  async canRead(userId: string, resourceId: string): Promise<boolean> {
    const user = await db.users.findById(userId);
    if (!user) return false;
    const resource = await db.resources.findById(resourceId);
    if (!resource) return false;
    // Can read if in the same org
    return user.organizationId === resource.organizationId;
  }

  async canWrite(userId: string, resourceId: string): Promise<boolean> {
    const user = await db.users.findById(userId);
    if (!user) return false;
    if (user.role !== 'admin') return false;
    const resource = await db.resources.findById(resourceId);
    if (!resource) return false;
    return user.organizationId === resource.organizationId;
  }

  async canDelete(userId: string, resourceId: string): Promise<boolean> {
    // Same as canWrite for now
    return this.canWrite(userId, resourceId);
  }
}
