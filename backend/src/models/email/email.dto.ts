import { z } from 'zod';

export const NotifyMembersSchema = z.object({
  additionalRecipientIds: z.array(z.string().min(1)).optional(),
});
export type NotifyMembersDto = z.infer<typeof NotifyMembersSchema>;

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

export interface PackMemberSearchResult {
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
