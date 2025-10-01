import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Download, CheckCircle, XCircle } from 'lucide-react';

interface BulkActionToolbarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkDelete?: () => void;
  onBulkStatusChange?: (status: string) => void;
  onBulkExport?: () => void;
  statusOptions?: { value: string; label: string }[];
}

export const BulkActionToolbar = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onBulkDelete,
  onBulkStatusChange,
  onBulkExport,
  statusOptions = []
}: BulkActionToolbarProps) => {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">
            {selectedCount} of {totalCount} selected
          </span>
          {selectedCount === totalCount ? (
            <Button variant="ghost" size="sm" onClick={onDeselectAll}>
              Deselect All
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={onSelectAll}>
              Select All ({totalCount})
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {statusOptions.length > 0 && onBulkStatusChange && (
            <Select onValueChange={onBulkStatusChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Change Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {onBulkExport && (
            <Button variant="outline" size="sm" onClick={onBulkExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}

          {onBulkDelete && (
            <Button variant="destructive" size="sm" onClick={onBulkDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
