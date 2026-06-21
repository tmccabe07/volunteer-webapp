'use client';

import { useRequireTier } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ImportForm from '@/components/admin/ImportForm';
import ImportLeadersForm from '@/components/admin/ImportLeadersForm';
import ImportParentLinksForm from '@/components/admin/ImportParentLinksForm';
import ImportAdventuresForm from '@/components/admin/ImportAdventuresForm';
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
            Import records and manage year-end changes from one place.
          </p>
        </section>

        <div>
          <h2 className="mb-4 text-lg font-semibold text-slate-700">Cub Scouts</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <ImportForm />
            <ImportParentLinksForm />
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold text-slate-700">Leaders</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <ImportLeadersForm />
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold text-slate-700">Program Catalog</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <ImportAdventuresForm />
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold text-slate-700">Year-End</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <RolloverDialog />
          </div>
        </div>

        <Card className="bg-white/95 shadow-md">
          <CardHeader>
            <CardTitle>Operational Notes</CardTitle>
            <CardDescription>
              These tools are intended for pack administrators and preserve historical records.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-slate-600 md:grid-cols-2 lg:grid-cols-4">
            <div>
              Cub scout import creates new records and can attach a starting den when the row
              includes one.
            </div>
            <div>
              Parent-link import creates approved links directly, bypassing the approval workflow.
              New parent accounts receive a 72-hour invite link.
            </div>
            <div>
              Leader import sets the account tier and den assignment. New accounts receive a 72-hour
              invite link. Den role assignment requires matching VolunteerRole records to be
              pre-configured.
            </div>
            <div>
              Adventure import upserts the catalog — existing adventures and requirements are updated
              in place. Dry-run rollovers let you preview the next program year before advancing
              ranks.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
