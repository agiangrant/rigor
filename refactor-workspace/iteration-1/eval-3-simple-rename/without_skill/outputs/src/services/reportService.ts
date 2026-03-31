import { formatDate, formatDateTime } from '../utils/dateFormatting';

export class ReportService {
  generateReport(startDate: Date, endDate: Date) {
    return {
      title: `Report: ${formatDate(startDate)} to ${formatDate(endDate)}`,
      generatedAt: formatDateTime(new Date()),
    };
  }
}
