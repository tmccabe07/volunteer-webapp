'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, AlertCircle, CheckCircle2, Users } from 'lucide-react';
import CompletionSteps from './CompletionSteps';

interface TaskDetailsProps {
  task: {
    id: string;
    name: string;
    description: string | null;
    dueDate: string;
    isOverdue: boolean;
    completionSteps: Array<{ step: string; url: string | null }> | null;
    isPackWide: boolean;
    isRecurring: boolean;
    recurringEndDate: string | null;
    assignedRoles: Array<{ id: string; name: string }>;
    currentUserCompletion: {
      id: string;
      completedAt: string;
      isComplete: boolean;
    } | null;
    createdBy: {
      id: string;
      name: string;
    };
    createdAt: string;
    updatedAt: string;
  };
}

export default function TaskDetails({ task }: TaskDetailsProps) {
  const dueDate = new Date(task.dueDate);
  const formattedDueDate = dueDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const isComplete = task.currentUserCompletion !== null;

  return (
    <div className="space-y-6">
      {/* Main Task Info */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl">{task.name}</CardTitle>
              {task.description && (
                <CardDescription className="mt-2 text-base">
                  {task.description}
                </CardDescription>
              )}
            </div>
            <div className="flex gap-2 flex-col">
              {isComplete ? (
                <Badge variant="default">Complete</Badge>
              ) : task.isOverdue ? (
                <Badge variant="destructive">Overdue</Badge>
              ) : (
                <Badge variant="secondary">Pending</Badge>
              )}
              {task.isRecurring && (
                <Badge variant="outline">Recurring</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 mr-3 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Due Date</p>
                <p className="font-medium">{formattedDueDate}</p>
              </div>
            </div>

            {task.isRecurring && task.recurringEndDate && (
              <div className="flex items-center">
                <Calendar className="h-5 w-5 mr-3 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Recurring Until</p>
                  <p className="font-medium">
                    {new Date(task.recurringEndDate).toLocaleDateString('en-US')}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center">
              <User className="h-5 w-5 mr-3 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Created By</p>
                <p className="font-medium">{task.createdBy.name}</p>
              </div>
            </div>

            <div className="flex items-center">
              <Users className="h-5 w-5 mr-3 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Assigned To</p>
                <p className="font-medium">
                  {task.isPackWide ? 'Pack-Wide' : `${task.assignedRoles.length} role(s)`}
                </p>
              </div>
            </div>
          </div>

          {!task.isPackWide && task.assignedRoles.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-2">Assigned Roles:</p>
              <div className="flex flex-wrap gap-2">
                {task.assignedRoles.map(role => (
                  <Badge key={role.id} variant="outline">{role.name}</Badge>
                ))}
              </div>
            </div>
          )}

          {isComplete && task.currentUserCompletion && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Task Completed</p>
                <p className="text-sm text-green-700">
                  Completed on {new Date(task.currentUserCompletion.completedAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          )}

          {task.isOverdue && !isComplete && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-900">Task Overdue</p>
                <p className="text-sm text-red-700">
                  This task is past its due date. Please complete it as soon as possible.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completion Steps */}
      {task.completionSteps && task.completionSteps.length > 0 && (
        <CompletionSteps steps={task.completionSteps} />
      )}
    </div>
  );
}
