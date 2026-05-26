'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type SpecialAward } from '@/services/awardService';

interface SpecialAwardsListProps {
  awards: SpecialAward[];
}

export default function SpecialAwardsList({ awards }: SpecialAwardsListProps) {
  if (awards.length === 0) {
    return <p className="text-sm text-slate-600">No special awards created yet in this session.</p>;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {awards.map((award) => (
        <Card key={award.id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{award.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <div>Category: {award.category}</div>
            <div>{award.description || 'No description provided.'}</div>
            <Badge variant="outline">
              {award.requiresNomination ? 'Nomination Required' : 'Open Award'}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
