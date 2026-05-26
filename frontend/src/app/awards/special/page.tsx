'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { type SpecialAward } from '@/services/awardService';
import CreateSpecialAwardForm from '@/components/awards/CreateSpecialAwardForm';
import SpecialAwardsList from '@/components/awards/SpecialAwardsList';

export default function SpecialAwardsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [awards, setAwards] = useState<SpecialAward[]>([]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (!isLoading && user && user.authTier === 'PARENT') {
      router.push('/unauthorized');
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (!user || user.authTier === 'PARENT') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Special Awards</h1>
        <p className="text-slate-600 mt-2">Create and review special awards managed outside adventure catalogs.</p>
      </div>

      <CreateSpecialAwardForm onCreated={(created) => setAwards((prev) => [created, ...prev])} />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Recently Created</h2>
        <SpecialAwardsList awards={awards} />
      </section>
    </div>
  );
}
