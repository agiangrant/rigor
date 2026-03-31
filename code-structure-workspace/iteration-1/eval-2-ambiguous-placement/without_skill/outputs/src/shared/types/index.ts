export interface User { id: string; email: string; }
export interface Invoice { id: string; userId: string; amount: number; }

export interface AuditEntry {
  actor: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}
