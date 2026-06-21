'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminBulkService, type ImportBatchStatus, type InviteLink } from '@/services/adminBulkService';

const LEADERS_CSV_TEMPLATE = [
  'email,name,authTier,denNumber',
  'jsmith@example.com,Jane Smith,LEADER,2',
  'bwilson@example.com,Bob Wilson,LEADER,',
  'aclark@example.com,Anne Clark,ADMIN,',
].join('\n');

export default function ImportLeadersForm() {
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [batchStatus, setBatchStatus] = useState<ImportBatchStatus | null>(null);
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);

  const downloadTemplate = () => {
    const blob = new Blob([`${LEADERS_CSV_TEMPLATE}\n`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'leaders-import-template.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!file) {
      setError('Choose a CSV file before importing.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await adminBulkService.importLeaders(file);
      const status = await adminBulkService.getImportBatch(response.batchId);
      setBatchStatus(status);
      setInviteLinks(response.inviteLinks);
    } catch (submissionError: any) {
      setError(submissionError.response?.data?.message || 'Failed to start the import.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInviteUrl = (token: string) =>
    `${window.location.origin}/auth/reset-password/confirm?token=${token}`;

  const copyAllLinks = () => {
    const text = inviteLinks
      .map(l => `${l.name} <${l.email}>\n${getInviteUrl(l.token)}`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <Card className="bg-white/95 shadow-md">
      <CardHeader>
        <CardTitle>Leader CSV Import</CardTitle>
        <CardDescription>
          Create leader accounts in bulk. New accounts receive a 72-hour invite link to set their
          password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Input
              id="leaders-import-file"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <p className="text-sm text-muted-foreground">
              Expected columns: email, name, authTier (LEADER/DEN_CHIEF/ADMIN), denNumber
              (optional).
            </p>
            <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
              Download CSV template
            </Button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {batchStatus && (
            <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900">
              <div className="font-medium">
                Import {batchStatus.status === 'COMPLETED' ? 'complete' : 'complete with errors'}
              </div>
              <div>
                Success: {batchStatus.successRows} · Failed: {batchStatus.failedRows}
              </div>
              {batchStatus.failedRows > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-green-800">
                  {batchStatus.errors.slice(0, 5).map((item) => (
                    <li key={`${item.rowNumber}-${item.errorMessage}`}>
                      Row {item.rowNumber}: {item.errorMessage}
                    </li>
                  ))}
                  {batchStatus.errors.length > 5 && (
                    <li>...and {batchStatus.errors.length - 5} more errors.</li>
                  )}
                </ul>
              )}
            </div>
          )}

          {inviteLinks.length > 0 && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">
                  {inviteLinks.length} invite link{inviteLinks.length !== 1 ? 's' : ''} generated
                </span>
                <Button type="button" variant="outline" size="sm" onClick={copyAllLinks}>
                  Copy all
                </Button>
              </div>
              <ul className="space-y-2">
                {inviteLinks.map((link) => (
                  <li key={link.email} className="space-y-0.5">
                    <div className="font-medium">
                      {link.name} &lt;{link.email}&gt;
                    </div>
                    <div className="break-all font-mono text-xs text-blue-700">
                      {getInviteUrl(link.token)}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-blue-700">Links expire in 72 hours.</p>
            </div>
          )}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Starting import...' : 'Import Leaders'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
