'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Calendar, Users, Shield } from 'lucide-react';
import type { ChildScoutDetail } from '@/services/childScout.service';

const RANK_LABELS: Record<string, string> = {
  LION: 'Lion',
  TIGER: 'Tiger',
  WOLF: 'Wolf',
  BEAR: 'Bear',
  WEBELOS: 'Webelos',
  AOL: 'Arrow of Light',
};

const RANK_COLORS: Record<string, string> = {
  LION: 'bg-yellow-100 text-yellow-800',
  TIGER: 'bg-orange-100 text-orange-800',
  WOLF: 'bg-blue-100 text-blue-800',
  BEAR: 'bg-green-100 text-green-800',
  WEBELOS: 'bg-purple-100 text-purple-800',
  AOL: 'bg-red-100 text-red-800',
};

interface ChildScoutProfileProps {
  child: ChildScoutDetail;
}

export default function ChildScoutProfile({ child }: ChildScoutProfileProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Scout Information
            </CardTitle>
            {!child.isActive && (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Name</label>
            <p className="text-lg font-semibold">
              {child.firstName} {child.lastName}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Current Rank</label>
            <div className="mt-1">
              <Badge className={`${RANK_COLORS[child.currentRank] || 'bg-gray-100 text-gray-800'} text-sm`}>
                {RANK_LABELS[child.currentRank] || child.currentRank}
              </Badge>
            </div>
          </div>

          {child.scoutbookId && (
            <div>
              <label className="text-sm font-medium text-gray-600">Scoutbook ID</label>
              <p className="text-sm mt-1">{child.scoutbookId}</p>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>Member since {formatDate(child.createdAt)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Current Den */}
      {child.currentDen && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Current Den
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg">{child.currentDen.name}</p>
                <p className="text-sm text-gray-600">
                  Den {child.currentDen.denNumber} • {RANK_LABELS[child.currentDen.rankLevel]}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parent Links */}
      {child.parentLinks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Parent/Guardian Links
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {child.parentLinks.map((link) => (
                <div key={link.id} className="flex items-start justify-between border-b pb-3 last:border-0 last:pb-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{link.parentName}</p>
                      <Badge
                        variant={link.status === 'APPROVED' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {link.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                      <Mail className="h-3 w-3" />
                      <span>{link.parentEmail}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 capitalize">
                      {link.relationshipType}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
