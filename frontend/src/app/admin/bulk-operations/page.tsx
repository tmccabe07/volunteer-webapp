'use client';

import { useRequireTier } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ImportForm from '@/components/admin/ImportForm';
import RolloverDialog from '@/components/admin/RolloverDialog';

export default function AdminBulkOperationsPage() {
  const { user, isLoading } = useRequireTier('ADMIN');

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading admin tools...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f9fbff_0%,#f3f6fb_45%,#eef2f7_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Admin Tools</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-950">Bulk Operations</h1>
          <p className="mt-3 max-w-3xl text-base text-slate-600">
            Import child records, preview the annual rollover, and execute year-end changes from one place.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <ImportForm />
          <RolloverDialog />
        </div>

        <Card className="bg-white/95 shadow-md">
          <CardHeader>
            <CardTitle>Operational Notes</CardTitle>
            <CardDescription>
              These tools are intended for pack administrators and preserve historical den and child records.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-slate-600 md:grid-cols-3">
            <div>
              CSV import creates new cub scout records and can attach a starting den when the row includes one.
            </div>
            <div>
              Transfer and batch assign endpoints use temporal membership records so den history stays intact.
            </div>
            <div>
              Dry-run rollovers let you preview the next program year before advancing den and child ranks.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}