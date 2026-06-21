'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminBulkService, type ImportBatchStatus } from '@/services/adminBulkService';

const ADVENTURES_CSV_TEMPLATE = [
  'rankLevel,adventureName,classification,adventureDisplayOrder,requirementOrder,requirementText,description,catalogYear',
  'TIGER,Tiger Bites,REQUIRED,1,1,Make a food craft with your den.,Learn about healthy eating.,2024',
  'TIGER,Tiger Bites,REQUIRED,1,2,Visit a food bank or community garden.,Explore how food helps our community.,2024',
  'WOLF,Call of the Wild,REQUIRED,1,1,Spend time outdoors with your family.,,2024',
].join('\n');

export default function ImportAdventuresForm() {
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [batchStatus, setBatchStatus] = useState<ImportBatchStatus | null>(null);

  const downloadTemplate = () => {
    const blob = new Blob([`${ADVENTURES_CSV_TEMPLATE}\n`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'adventures-import-template.csv';
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
      const response = await adminBulkService.importAdventures(file);
      const status = await adminBulkService.getImportBatch(response.batchId);
      setBatchStatus(status);
    } catch (submissionError: any) {
      setError(submissionError.response?.data?.message || 'Failed to start the import.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-white/95 shadow-md">
      <CardHeader>
        <CardTitle>Adventures &amp; Requirements Import</CardTitle>
        <CardDescription>
          Seed or update the adventure and requirement catalog. One row per requirement. Existing
          adventures and requirements are updated in place.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Input
              id="adventures-import-file"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <p className="text-sm text-muted-foreground">
              Expected columns: rankLevel, adventureName, classification
              (REQUIRED/ELECTIVE/SPECIAL_ELECTIVE), adventureDisplayOrder, requirementOrder,
              requirementText, description (optional), catalogYear.
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

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Starting import...' : 'Import Adventures'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
