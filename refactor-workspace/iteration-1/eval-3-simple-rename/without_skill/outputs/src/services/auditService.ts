import { formatDateTime } from '../utils/dateFormatting';

export class AuditService {
  logAction(action: string) {
    return { action, timestamp: formatDateTime(new Date()) };
  }
}
