'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { emailNotificationService } from '@/services/emailNotification.service';
import type { PackMemberResult, EmailPreviewResponse } from '@/services/emailNotification.service';
import { Bell, X, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Props {
  eventId: string;
  mode: 'notify' | 'summary';
  disabled?: boolean;
}

export default function NotifyMembersDialog({ eventId, mode, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<EmailPreviewResponse | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PackMemberResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<PackMemberResult[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ recipientCount: number; skippedCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const title = mode === 'notify' ? 'Notify Members' : 'Send Completion Summary';
  const description =
    mode === 'notify'
      ? 'Send an email notification about this event to all members in scope.'
      : 'Send a post-event summary email to all members in scope.';

  useEffect(() => {
    if (open) {
      setResult(null);
      setError(null);
      setSelected([]);
      setSearchQuery('');
      setSearchResults([]);
      loadPreview();
    }
  }, [open]);

  const loadPreview = async () => {
    setLoadingPreview(true);
    try {
      const data = await emailNotificationService.getEventEmailPreview(eventId);
      setPreview(data);
    } catch {
      setPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await emailNotificationService.searchPackMembers(q);
        const selectedIds = new Set(selected.map((s) => s.id));
        setSearchResults(results.filter((r) => !selectedIds.has(r.id)));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const addRecipient = (member: PackMemberResult) => {
    setSelected((prev) => [...prev, member]);
    setSearchResults((prev) => prev.filter((r) => r.id !== member.id));
    setSearchQuery('');
  };

  const removeRecipient = (id: string) => {
    setSelected((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSend = async () => {
    setSending(true);
    setError(null);
    try {
      const additionalRecipientIds = selected.map((s) => s.id);
      const res =
        mode === 'notify'
          ? await emailNotificationService.notifyEventMembers(eventId, additionalRecipientIds)
          : await emailNotificationService.sendCompletionSummary(eventId, additionalRecipientIds);
      setResult({ recipientCount: res.recipientCount, skippedCount: res.skippedCount });
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Failed to send')
          : 'Failed to send';
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  const withinCooldown = preview?.recentSend?.withinCooldown ?? false;
  const totalCount = (preview?.defaultRecipientCount ?? 0) + selected.length;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        <Bell className="h-4 w-4 mr-2" />
        {title}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          {result ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Sent successfully</span>
              </div>
              <p className="text-sm text-gray-600">
                {result.recipientCount} email{result.recipientCount !== 1 ? 's' : ''} sent
                {result.skippedCount > 0 ? `, ${result.skippedCount} skipped (no email on file)` : ''}.
              </p>
              <DialogFooter>
                <Button onClick={() => setOpen(false)}>Close</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">{description}</p>

              {loadingPreview ? (
                <p className="text-sm text-gray-500">Loading recipient count…</p>
              ) : (
                <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
                  <strong>{preview?.defaultRecipientCount ?? 0}</strong> default recipient
                  {preview?.defaultRecipientCount !== 1 ? 's' : ''} in scope
                  {selected.length > 0 && (
                    <span className="ml-1">+ {selected.length} additional</span>
                  )}
                </div>
              )}

              {withinCooldown && (
                <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    A notification was already sent recently. You can still send, but members may receive a duplicate.
                  </span>
                </div>
              )}

              {/* Additional recipient picker */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Add extra recipients (optional)
                </label>
                <Input
                  placeholder="Search by name…"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
                {searching && (
                  <p className="text-xs text-gray-500 mt-1">Searching…</p>
                )}
                {searchResults.length > 0 && (
                  <ul className="mt-1 border rounded-md divide-y max-h-36 overflow-y-auto text-sm">
                    {searchResults.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-gray-50"
                          onClick={() => addRecipient(r)}
                        >
                          {r.name}{' '}
                          <span className="text-xs text-gray-500">({r.type === 'denChief' ? 'Den Chief' : 'Volunteer'})</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {selected.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Additional recipients:</p>
                  <ul className="space-y-1">
                    {selected.map((r) => (
                      <li key={r.id} className="flex items-center justify-between text-sm bg-gray-50 rounded px-2 py-1">
                        <span>{r.name}</span>
                        <button
                          type="button"
                          onClick={() => removeRecipient(r.id)}
                          className="text-gray-400 hover:text-gray-700 ml-2"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-2">{error}</p>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
                  Cancel
                </Button>
                <Button onClick={handleSend} disabled={sending || totalCount === 0}>
                  {sending ? 'Sending…' : `Send to ${totalCount}`}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
