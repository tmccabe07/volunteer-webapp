'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, AlertCircle, CheckCircle2, Users, Clock } from 'lucide-react';

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

// Calculate urgency level based on days until due date
const getUrgencyLevel = (dueDate: Date, isComplete: boolean, isOverdue: boolean) => {
  if (isComplete) {
    return { level: 'none', color: 'text-[hsl(var(--success))]', bgColor: 'bg-[hsl(var(--success))]/10', label: 'Completed' };
  }
  
  if (isOverdue) {
    return { level: 'critical', color: 'text-[hsl(var(--danger))]', bgColor: 'bg-[hsl(var(--danger))]/10', label: 'Overdue', border: 'border-l-4 border-l-[hsl(var(--danger))]' };
  }
  
  const now = new Date();
  const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilDue <= 1) {
    return { level: 'critical', color: 'text-[hsl(var(--danger))]', bgColor: 'bg-[hsl(var(--danger))]/10', label: 'Due soon!', border: 'border-l-4 border-l-[hsl(var(--danger))]' };
  } else if (daysUntilDue <= 3) {
    return { level: 'high', color: 'text-[hsl(var(--warning))]', bgColor: 'bg-[hsl(var(--warning))]/10', label: `${daysUntilDue} days left`, border: 'border-l-4 border-l-[hsl(var(--warning))]' };
  } else if (daysUntilDue <= 7) {
    return { level: 'medium', color: 'text-yellow-600', bgColor: 'bg-yellow-50', label: `${daysUntilDue} days left`, border: 'border-l-4 border-l-yellow-400' };
  }
  
  return { level: 'low', color: 'text-gray-600', bgColor: 'bg-gray-50', label: `${daysUntilDue} days left`, border: '' };
};

export default function TaskCard({ task }: TaskCardProps) {
  const dueDate = new Date(task.dueDate);
  const formattedDueDate = dueDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const isComplete = task.currentUserCompletion !== null;
  const urgency = getUrgencyLevel(dueDate, isComplete, task.isOverdue);
  const statusVariant = isComplete ? 'default' : task.isOverdue ? 'destructive' : 'secondary';
  const statusText = isComplete ? 'Complete' : task.isOverdue ? 'Overdue' : 'Pending';

  return (
    <Link href={`/tasks/${task.id}`}>
      <Card className={`hover:shadow-lg transition-shadow cursor-pointer ${urgency.border}`}>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="h-4 w-4 mr-2" />
              Due: {formattedDueDate}
            </div>
            {urgency.level !== 'none' && urgency.level !== 'low' && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${urgency.color} ${urgency.bgColor}`}>
                <Clock className="h-3 w-3" />
                {urgency.label}
              </div>
            )}
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
