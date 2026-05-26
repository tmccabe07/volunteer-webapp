'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, ChevronDown, ChevronUp } from 'lucide-react';
import { advancementService, type Adventure } from '@/services/advancement.service';

interface CoveredRequirementsSelectorProps {
  /**
   * Rank level to show requirements for
   */
  rankLevel: string;
  /**
   * Currently selected requirement IDs
   */
  selectedRequirementIds: string[];
  /**
   * Callback when selection changes
   */
  onChange: (requirementIds: string[]) => void;
  /**
   * Whether the component is disabled
   */
  disabled?: boolean;
}

export default function CoveredRequirementsSelector({
  rankLevel,
  selectedRequirementIds,
  onChange,
  disabled = false,
}: CoveredRequirementsSelectorProps) {
  const [adventures, setAdventures] = useState<Adventure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAdventures, setExpandedAdventures] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (rankLevel) {
      loadAdventures();
    }
  }, [rankLevel]);

  const loadAdventures = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await advancementService.getAdventuresForRank(rankLevel);
      setAdventures(data.adventures);
      
      // Auto-expand first adventure
      if (data.adventures.length > 0) {
        setExpandedAdventures(new Set([data.adventures[0].id]));
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load requirements');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAdventure = (adventureId: string) => {
    const newExpanded = new Set(expandedAdventures);
    if (newExpanded.has(adventureId)) {
      newExpanded.delete(adventureId);
    } else {
      newExpanded.add(adventureId);
    }
    setExpandedAdventures(newExpanded);
  };

  const handleRequirementToggle = (requirementId: string) => {
    const newSelected = selectedRequirementIds.includes(requirementId)
      ? selectedRequirementIds.filter(id => id !== requirementId)
      : [...selectedRequirementIds, requirementId];
    onChange(newSelected);
  };

  const handleAdventureToggle = (adventure: Adventure) => {
    const adventureRequirementIds = adventure.requirements.map(r => r.id);
    const allSelected = adventureRequirementIds.every(id => 
      selectedRequirementIds.includes(id)
    );
    
    if (allSelected) {
      // Deselect all requirements in this adventure
      const newSelected = selectedRequirementIds.filter(
        id => !adventureRequirementIds.includes(id)
      );
      onChange(newSelected);
    } else {
      // Select all requirements in this adventure
      const newSelected = [...new Set([...selectedRequirementIds, ...adventureRequirementIds])];
      onChange(newSelected);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-600">
        <p>Loading requirements...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  if (adventures.length === 0) {
    return (
      <div className="p-4 text-center text-gray-600">
        <Award className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm">No adventures found for this rank</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>Covered Requirements (Optional)</Label>
      <div className="space-y-2 max-h-96 overflow-y-auto border rounded-md p-2">
        {adventures.map((adventure) => {
          const isExpanded = expandedAdventures.has(adventure.id);
          const adventureRequirementIds = adventure.requirements.map(r => r.id);
          const selectedCount = adventureRequirementIds.filter(id => 
            selectedRequirementIds.includes(id)
          ).length;

          return (
            <Card key={adventure.id} className="overflow-hidden">
              <CardHeader 
                className="p-3 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleAdventure(adventure.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <Checkbox
                      checked={selectedCount === adventure.requirements.length && selectedCount > 0}
                      onCheckedChange={() => {
                        handleAdventureToggle(adventure);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      disabled={disabled}
                    />
                    <div className="flex-1">
                      <CardTitle className="text-sm font-semibold">
                        {adventure.name}
                      </CardTitle>
                      {selectedCount > 0 && (
                        <p className="text-xs text-gray-600 mt-0.5">
                          {selectedCount} of {adventure.requirements.length} selected
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={adventure.classification === 'REQUIRED' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {adventure.classification}
                    </Badge>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-600" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-600" />
                    )}
                  </div>
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="p-3 pt-0 space-y-2 bg-gray-50">
                  {adventure.requirements.map((requirement) => (
                    <div key={requirement.id} className="flex items-start gap-2 p-2 bg-white rounded">
                      <Checkbox
                        id={`req-${requirement.id}`}
                        checked={selectedRequirementIds.includes(requirement.id)}
                        onCheckedChange={() => handleRequirementToggle(requirement.id)}
                        disabled={disabled}
                        className="mt-0.5"
                      />
                      <label 
                        htmlFor={`req-${requirement.id}`}
                        className="text-sm flex-1 cursor-pointer"
                      >
                        <span className="font-medium text-gray-700">
                          {requirement.displayOrder}.
                        </span>{' '}
                        {requirement.requirementText}
                      </label>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-gray-500">
        Select requirements that were covered during this meeting
      </p>
    </div>
  );
}
