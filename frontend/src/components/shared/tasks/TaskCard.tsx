'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, AlertCircle, CheckCircle2, Users } from 'lucide-react';

interface TaskCardProps {
  task: {
    id: string;
    name: string;
    description: string | null;
    dueDate: string;
    isOverdue: boolean;
    isPackWide: boolean;
    assignedRoles: Array<{ id: string; name: string }>;
    currentUserCompletion: {
      id: string;
      completedAt: string;
      isComplete: boolean;
    } | null;
  };
}

export default function TaskCard({ task }: TaskCardProps) {
  const dueDate = new Date(task.dueDate);
  const formattedDueDate = dueDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const isComplete = task.currentUserCompletion !== null;
  const statusVariant = isComplete ? 'default' : task.isOverdue ? 'destructive' : 'secondary';
  const statusText = isComplete ? 'Complete' : task.isOverdue ? 'Overdue' : 'Pending';

  return (
    <Link href={`/tasks/${task.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-xl">{task.name}</CardTitle>
              <CardDescription className="mt-1">
                {task.description || 'No description provided'}
              </CardDescription>
            </div>
            <Badge variant={statusVariant}>{statusText}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="h-4 w-4 mr-2" />
            Due: {formattedDueDate}
          </div>

          {isComplete && task.currentUserCompletion && (
            <div className="flex items-center text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Completed {new Date(task.currentUserCompletion.completedAt).toLocaleDateString()}
            </div>
          )}

          {task.isOverdue && !isComplete && (
            <div className="flex items-center text-sm text-red-600">
              <AlertCircle className="h-4 w-4 mr-2" />
              Past due date
            </div>
          )}

          <div className="flex items-center gap-2">
            {task.isPackWide ? (
              <Badge variant="outline">Pack-Wide</Badge>
            ) : (
              <div className="flex items-center text-sm text-gray-600">
                <Users className="h-4 w-4 mr-2" />
                {task.assignedRoles.length} {task.assignedRoles.length === 1 ? 'role' : 'roles'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
