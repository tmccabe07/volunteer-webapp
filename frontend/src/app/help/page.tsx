'use client';

import Link from 'next/link';
import { useRequireAuth } from '@/lib/auth-context';
import { helpGuides, AuthTierKey } from '@/lib/help-guides';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const tierLabels: Record<AuthTierKey, string> = {
  PARENT: 'Parent',
  LEADER: 'Den Leader',
  DEN_CHIEF: 'Den Chief',
  ADMIN: 'Pack Admin',
};

export default function HelpPage() {
  const { user, isLoading } = useRequireAuth();

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-4 bg-muted rounded w-72" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const tier = user.authTier as AuthTierKey;
  const sections = helpGuides[tier] ?? [];

  return (
    <div className="container py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Help &amp; Guides</h1>
        <p className="text-muted-foreground">
          Quick reference for {tierLabels[tier]} features.
        </p>
      </div>

      <div className="space-y-6">
        {sections.map((section) => (
          <Card key={section.heading} className="p-6">
            <h2 className="text-lg font-semibold mb-4 text-[hsl(var(--cub-blue))]">
              {section.heading}
            </h2>
            <div className="divide-y">
              {section.items.map((item) => (
                <div key={item.title} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                  <Link href={item.link} className="shrink-0">
                    <Button variant="plainoutline" size="sm" className="gap-1">
                      {item.linkLabel}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
