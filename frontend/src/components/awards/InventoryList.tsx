'use client';

import { type InventoryItem } from '@/services/awardService';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface InventoryListProps {
  items: InventoryItem[];
  onAdjust: (item: InventoryItem) => void;
}

export default function InventoryList({ items, onAdjust }: InventoryListProps) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-600">No inventory items available.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead>Rank</TableHead>
          <TableHead>On Hand</TableHead>
          <TableHead>Reorder Point</TableHead>
          <TableHead>Unit Cost</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.itemName}</TableCell>
            <TableCell>{item.rankLevel ?? 'All Ranks'}</TableCell>
            <TableCell>{item.onHandQuantity}</TableCell>
            <TableCell>{item.reorderPoint ?? 'n/a'}</TableCell>
            <TableCell>{item.unitCost === null ? 'n/a' : `$${item.unitCost.toFixed(2)}`}</TableCell>
            <TableCell className="text-right">
              <Button size="sm" variant="outline" onClick={() => onAdjust(item)}>
                Adjust
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
