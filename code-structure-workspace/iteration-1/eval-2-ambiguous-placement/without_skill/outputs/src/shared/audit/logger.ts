import { db } from '../db/client';
import { AuditEntry } from '../types';

export class AuditLogger {
  static async log(
    actor: string,
    action: string,
    resource: string,
    resourceId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<AuditEntry> {
    const entry: AuditEntry = {
      actor,
      action,
      resource,
      resourceId,
      metadata,
      timestamp: new Date(),
    };
    await db.auditLogs.create(entry);
    return entry;
  }
}
