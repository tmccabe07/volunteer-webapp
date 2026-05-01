'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, CheckCircle } from 'lucide-react';

interface CompletionStepsProps {
  steps: Array<{
    step: string;
    url: string | null;
  }>;
}

export default function CompletionSteps({ steps }: CompletionStepsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Completion Steps</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {steps.map((stepItem, index) => (
            <li key={index} className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
              </div>
              <div className="flex-1">
                <p className="text-gray-900">{stepItem.step}</p>
                {stepItem.url && (
                  <a
                    href={stepItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline mt-1"
                  >
                    Reference Link
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
