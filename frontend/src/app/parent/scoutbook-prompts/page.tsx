'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ParentPromptsList from '@/components/parent/ParentPromptsList';
import { useAuth } from '@/lib/auth-context';
import type { PromptCategory } from '@/services/hoursPromptService';

export default function ParentScoutbookPromptsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const childScoutId = searchParams.get('childScoutId') || undefined;
  const denId = searchParams.get('denId') || undefined;
  const categoryParam = searchParams.get('category');
  const category: PromptCategory | undefined =
    categoryParam === 'CAMPING' ||
    categoryParam === 'HIKING' ||
    categoryParam === 'SERVICE' ||
    categoryParam === 'REQUIREMENT'
      ? categoryParam
      : undefined;

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (!isLoading && user?.authTier === 'PARENT') {
      return;
    }

    if (!isLoading && user && user.authTier !== 'LEADER' && user.authTier !== 'ADMIN' && user.authTier !== 'PARENT') {
      router.push('/events');
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Scoutbook Prompts</h1>
        <p className="text-gray-600 mt-2">
          Review suggested hour and requirement entries and mark them done in Scoutbook.
        </p>
      </div>

      <ParentPromptsList childScoutId={childScoutId} denId={denId} category={category} />
    </div>
  );
}
