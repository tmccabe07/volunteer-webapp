'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { emailNotificationService } from '@/services/emailNotification.service';
import { Bell, CheckCircle2, Clock } from 'lucide-react';

interface Props {
  taskId: string;
  dueDate: string;
}

function isOverdueOrDueToday(dueDate: string): boolean {
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due <= today;
}

export default function SendReminderButton({ taskId, dueDate }: Props) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldownMessage, setCooldownMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eligible = isOverdueOrDueToday(dueDate);

  if (!eligible) return null;

  const handleSend = async () => {
    if (!confirm('Send a reminder email to all volunteers assigned to this task?')) return;
    setSending(true);
    setError(null);
    setCooldownMessage(null);
    try {
      await emailNotificationService.sendTaskReminder(taskId);
      setSent(true);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { error?: string; lastSentAt?: string } } };
      if (e.response?.status === 409) {
        const last = e.response.data?.lastSentAt
          ? ` (last sent ${new Date(e.response.data.lastSentAt).toLocaleString()})`
          : '';
        setCooldownMessage(`A reminder was already sent within the last 24 hours${last}.`);
      } else {
        setError(e.response?.data?.error ?? 'Failed to send reminder');
      }
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-green-700">
        <CheckCircle2 className="h-4 w-4" />
        Reminder sent
      </div>
    );
  }

  if (cooldownMessage) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
        <Clock className="h-4 w-4 shrink-0" />
        {cooldownMessage}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Button variant="outline" size="sm" onClick={handleSend} disabled={sending}>
        <Bell className="h-4 w-4 mr-2" />
        {sending ? 'Sending…' : 'Send Reminder'}
      </Button>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
