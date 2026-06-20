import axios from '@/lib/axios';

export interface EmailPreviewResponse {
  defaultRecipientCount: number;
  recentSend: { sentAt: string; withinCooldown: boolean } | null;
}

export interface NotifySendResponse {
  emailLogId: string;
  recipientCount: number;
  skippedCount: number;
  failedCount: number;
  status: string;
  withinCooldownWarning?: boolean;
}

export interface PackMemberResult {
  id: string;
  name: string;
  type: 'volunteer' | 'denChief';
  email: string;
}

export interface EmailLogEntry {
  id: string;
  templateType: string;
  senderName: string;
  recipientCount: number;
  skippedCount: number;
  failedCount: number;
  status: string;
  sentAt: string;
}

class EmailNotificationService {
  async getEventEmailPreview(eventId: string): Promise<EmailPreviewResponse> {
    const res = await axios.get<EmailPreviewResponse>(`/events/${eventId}/email-preview`);
    return res.data;
  }

  async notifyEventMembers(
    eventId: string,
    additionalRecipientIds?: string[],
  ): Promise<NotifySendResponse> {
    const res = await axios.post<NotifySendResponse>(`/events/${eventId}/notify-members`, {
      additionalRecipientIds,
    });
    return res.data;
  }

  async sendCompletionSummary(
    eventId: string,
    additionalRecipientIds?: string[],
  ): Promise<NotifySendResponse> {
    const res = await axios.post<NotifySendResponse>(`/events/${eventId}/send-completion-summary`, {
      additionalRecipientIds,
    });
    return res.data;
  }

  async sendTaskReminder(taskId: string): Promise<NotifySendResponse> {
    const res = await axios.post<NotifySendResponse>(`/admin-tasks/${taskId}/send-reminder`);
    return res.data;
  }

  async searchPackMembers(q: string): Promise<PackMemberResult[]> {
    const res = await axios.get<PackMemberResult[]>('/pack/members/search', { params: { q } });
    return res.data;
  }

  async getEventEmailLogs(eventId: string): Promise<EmailLogEntry[]> {
    const res = await axios.get<EmailLogEntry[]>(`/events/${eventId}/email-logs`);
    return res.data;
  }
}

export const emailNotificationService = new EmailNotificationService();
