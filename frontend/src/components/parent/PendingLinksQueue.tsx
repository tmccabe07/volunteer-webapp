'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock3, RefreshCw } from 'lucide-react';
import {
  parentLinkService,
  type PendingFilterDenItem,
  type PendingLinkItem,
} from '@/services/parentLinkService';
import LinkApprovalDialog from './LinkApprovalDialog';

export default function PendingLinksQueue() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingLinks, setPendingLinks] = useState<PendingLinkItem[]>([]);
  const [dens, setDens] = useState<PendingFilterDenItem[]>([]);
  const [denFilter, setDenFilter] = useState('ALL');
  const [selectedLink, setSelectedLink] = useState<PendingLinkItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadDens();
  }, []);

  const loadPendingLinks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await parentLinkService.getPendingLinks(
        denFilter !== 'ALL' ? denFilter : undefined,
      );
      setPendingLinks(response.data);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const maybeResponse = (err as { response?: { data?: { error?: string } } }).response;
        setError(maybeResponse?.data?.error || 'Failed to load pending links');
      } else {
        setError('Failed to load pending links');
      }
    } finally {
      setIsLoading(false);
    }
  }, [denFilter]);

  useEffect(() => {
    loadPendingLinks();
  }, [loadPendingLinks]);

  const loadDens = async () => {
    try {
      const response = await parentLinkService.getPendingFilterDens();
      setDens(response.data);
    } catch {
      setDens([]);
    }
  };

  const openReviewDialog = (link: PendingLinkItem) => {
    setSelectedLink(link);
    setIsDialogOpen(true);
  };

  const handleApprove = async (linkId: string) => {
    await parentLinkService.approveLink(linkId);
    await loadPendingLinks();
  };

  const handleReject = async (linkId: string, reason: string) => {
    await parentLinkService.rejectLink(linkId, reason);
    await loadPendingLinks();
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedLink(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <Clock3 className="h-5 w-5" />
            Pending Parent Link Requests
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={denFilter} onValueChange={setDenFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filter by den" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Dens</SelectItem>
                {dens.map((den) => (
                  <SelectItem key={den.id} value={den.id}>
                    {den.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="sm" onClick={loadPendingLinks}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-gray-600">Loading pending requests...</p>
        ) : error ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
            {error}
          </div>
        ) : pendingLinks.length === 0 ? (
          <p className="text-sm text-gray-600">No pending link requests.</p>
        ) : (
          <div className="space-y-3">
            {pendingLinks.map((link) => (
              <div key={link.id} className="border rounded-md p-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-sm">
                    <span className="font-medium">Parent:</span> {link.parent.name} ({link.parent.email})
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Cub Scout:</span> {link.childScout.firstName} {link.childScout.lastName}
                  </div>
                  <div className="text-sm flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{link.childScout.currentRank}</Badge>
                    <span className="text-gray-600">{link.childScout.denName || 'No den assigned'}</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Requested: {new Date(link.requestedAt).toLocaleString()}
                  </div>
                </div>
                <Button onClick={() => openReviewDialog(link)}>Review</Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <LinkApprovalDialog
        open={isDialogOpen}
        link={selectedLink}
        onClose={closeDialog}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </Card>
  );
}
