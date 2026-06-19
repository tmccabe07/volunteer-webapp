'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminBulkService, type ImportBatchStatus } from '@/services/adminBulkService';

const CUB_SCOUT_CSV_TEMPLATE = [
  'firstName,lastName,currentRank,scoutbookId,denNumber',
  'Jane,Doe,TIGER,,2',
].join('\n');

interface ImportFormProps {
  onImported?: (batchId: string) => void;
}

export default function ImportForm({ onImported }: ImportFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [batchStatus, setBatchStatus] = useState<ImportBatchStatus | null>(null);

  const downloadTemplate = () => {
    const blob = new Blob([`${CUB_SCOUT_CSV_TEMPLATE}\n`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'cub-scout-import-template.csv';
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
      const response = await adminBulkService.importChildScouts(file);
      const status = await adminBulkService.getImportBatch(response.batchId);
      setBatchStatus(status);
      onImported?.(response.batchId);
    } catch (submissionError: any) {
      setError(submissionError.response?.data?.message || 'Failed to start the import.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-white/95 shadow-md">
      <CardHeader>
        <CardTitle>Cub Scout CSV Import</CardTitle>
        <CardDescription>Upload a Scoutbook export or pack roster CSV to create cub scout records in bulk.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Input
              id="import-file"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <p className="text-sm text-muted-foreground">
              Expected columns: firstName, lastName, currentRank, scoutbookId, denNumber.
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
              <div>Batch ID: {batchStatus.id}</div>
              <div>
                Processed {batchStatus.successRows + batchStatus.failedRows} of {batchStatus.totalRows} rows
              </div>
              <div>
                Success: {batchStatus.successRows} · Failed: {batchStatus.failedRows}
              </div>
              {batchStatus.failedRows > 0 && (
                <div className="mt-2 space-y-1 text-green-800">
                  <div className="font-medium">Row errors</div>
                  <ul className="list-disc space-y-1 pl-5">
                    {batchStatus.errors.slice(0, 5).map((item) => (
                      <li key={`${item.rowNumber}-${item.errorMessage}`}>
                        Row {item.rowNumber}: {item.errorMessage}
                      </li>
                    ))}
                  </ul>
                  {batchStatus.errors.length > 5 && (
                    <div>Showing first 5 errors. Open the batch in the API to see the full list.</div>
                  )}
                </div>
              )}
            </div>
          )}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Starting import...' : 'Import Cub Scouts'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}