import { formatDateTime } from '../utils/formatDate';

export class AuditService {
  logAction(action: string) {
    return { action, timestamp: formatDateTime(new Date()) };
  }
}
