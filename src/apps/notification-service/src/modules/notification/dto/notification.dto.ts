export enum NotificationType {
  TRANSACTION = 'transaction',
  FILE_PROCESSING = 'file_processing',
  SYSTEM = 'system',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

export enum NotificationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SENT = 'sent',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}
