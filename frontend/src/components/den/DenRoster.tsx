'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Mail, Calendar, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DenRoster as DenRosterType } from '@/services/den.service';

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

interface DenRosterProps {
  roster: DenRosterType;
  canRemoveMembers?: boolean;
  removingMemberId?: string | null;
  onRemoveMember?: (childScoutId: string, fullName: string) => void;
}

export default function DenRoster({
  roster,
  canRemoveMembers = false,
  removingMemberId = null,
  onRemoveMember,
}: DenRosterProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Den Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {roster.den.name}
            </CardTitle>
            <Badge className={RANK_COLORS[roster.den.rankLevel] || 'bg-gray-100 text-gray-800'}>
              {RANK_LABELS[roster.den.rankLevel] || roster.den.rankLevel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Den {roster.den.denNumber} • {roster.members.length} {roster.members.length === 1 ? 'scout' : 'scouts'}
          </p>
        </CardContent>
      </Card>

      {/* Members List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Current Members</h3>
        
        {roster.members.length === 0 ? (
          <Card className="p-8 text-center text-gray-600">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="font-medium">No members in this den</p>
            <p className="text-sm mt-1">Add members to get started</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {roster.members.map((member) => (
              <Card key={member.id}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Scout Info */}
                    <div>
                      <h4 className="font-semibold text-lg">
                        {member.firstName} {member.lastName}
                      </h4>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <Calendar className="h-3 w-3" />
                        <span>Member since {formatDate(member.memberSince)}</span>
                      </div>
                    </div>

                    {canRemoveMembers && onRemoveMember && (
                      <div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-300 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-400"
                          onClick={() => onRemoveMember(member.id, `${member.firstName} ${member.lastName}`)}
                          disabled={removingMemberId === member.id}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {removingMemberId === member.id ? 'Removing...' : 'Remove'}
                        </Button>
                      </div>
                    )}

                    {/* Parents */}
                    {member.parents.length > 0 && (
                      <div className="border-t pt-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Parent{member.parents.length > 1 ? 's' : ''} / Guardian{member.parents.length > 1 ? 's' : ''}
                        </p>
                        <div className="space-y-2">
                          {member.parents.map((parent, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm">
                              <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                              <div>
                                <p className="font-medium">{parent.name}</p>
                                <p className="text-gray-600">{parent.email}</p>
                                <p className="text-xs text-gray-500 capitalize">{parent.relationshipType}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
