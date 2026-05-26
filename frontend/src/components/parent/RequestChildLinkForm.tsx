'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus2 } from 'lucide-react';
import { parentLinkService, type RequestableCubScoutItem } from '@/services/parentLinkService';

interface RequestChildLinkFormProps {
  onSuccess?: () => void;
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const maybeResponse = (error as {
      response?: {
        status?: number;
        data?: { error?: string };
      };
    }).response;

    if (maybeResponse?.status === 409) {
      return 'A link request already exists for this Cub Scout.';
    }

    if (maybeResponse?.data?.error) {
      return maybeResponse.data.error;
    }
  }

  return fallback;
}

export default function RequestChildLinkForm({ onSuccess }: RequestChildLinkFormProps) {
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [children, setChildren] = useState<RequestableCubScoutItem[]>([]);
  const [childScoutId, setChildScoutId] = useState('');
  const [relationshipType, setRelationshipType] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadChildren = async () => {
      try {
        setIsLoadingChildren(true);
        setError(null);
        const response = await parentLinkService.getRequestableCubScouts();
        setChildren(response.data);
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, 'Failed to load Cub Scouts'));
      } finally {
        setIsLoadingChildren(false);
      }
    };

    loadChildren();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!childScoutId) {
      setError('Please select a Cub Scout');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      await parentLinkService.requestLink({
        childScoutId,
        relationshipType: relationshipType.trim() || undefined,
      });

      setSuccessMessage('Link request submitted successfully. A leader will review it soon.');
      setChildScoutId('');
      setRelationshipType('');
      onSuccess?.();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to submit link request'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus2 className="h-5 w-5" />
          Request Parent-Cub Scout Link
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-800">
              {successMessage}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="childScoutId">Cub Scout *</Label>
            <Select
              value={childScoutId}
              onValueChange={(value) => {
                setChildScoutId(value);
                setError(null);
                setSuccessMessage(null);
              }}
              disabled={isSubmitting || isLoadingChildren}
            >
              <SelectTrigger id="childScoutId">
                <SelectValue
                  placeholder={isLoadingChildren ? 'Loading Cub Scouts...' : 'Select a Cub Scout'}
                />
              </SelectTrigger>
              <SelectContent>
                {children.length === 0 ? (
                  <div className="p-2 text-sm text-gray-600">No active Cub Scouts found</div>
                ) : (
                  children.map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.firstName} {child.lastName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="relationshipType">Relationship (Optional)</Label>
            <Input
              id="relationshipType"
              type="text"
              value={relationshipType}
              onChange={(e) => {
                setRelationshipType(e.target.value);
                setError(null);
                setSuccessMessage(null);
              }}
              placeholder="e.g., mother, father, guardian"
              maxLength={40}
              disabled={isSubmitting}
            />
          </div>

          {children.length === 0 && !isLoadingChildren && (
            <p className="text-sm text-gray-600">
              Need to add a Cub Scout first?{' '}
              <Link href="/cubs" className="underline hover:no-underline">
                Go to Cub Scouts
              </Link>
            </p>
          )}

          <Button type="submit" disabled={isSubmitting || isLoadingChildren || children.length === 0}>
            {isSubmitting ? 'Submitting...' : 'Submit Link Request'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
