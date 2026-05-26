'use client';

import { AlertTriangle } from 'lucide-react';

interface ReorderAlertsProps {
  alerts: Array<{
    inventoryItemId: string;
    itemName: string;
    onHandQuantity: number;
    reorderPoint: number | null;
  }>;
}

export default function ReorderAlerts({ alerts }: ReorderAlertsProps) {
  if (alerts.length === 0) {
    return <p className="text-sm text-slate-600">No reorder alerts at the moment.</p>;
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div key={alert.inventoryItemId} className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 mt-0.5" />
          <div>
            <div className="font-medium">{alert.itemName}</div>
            <div>
              On hand: {alert.onHandQuantity}, reorder point: {alert.reorderPoint ?? 'n/a'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
