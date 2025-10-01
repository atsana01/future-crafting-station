import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { DateRangePicker } from './DateRangePicker';
import { BulkActionToolbar } from './BulkActionToolbar';

interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  onBulkDelete?: (items: T[]) => void;
  onBulkStatusChange?: (items: T[], status: string) => void;
  onBulkExport?: (items: T[]) => void;
  statusOptions?: { value: string; label: string }[];
  searchPlaceholder?: string;
  showDateFilter?: boolean;
  getItemId: (item: T) => string;
}

export function DataTable<T>({
  data,
  columns,
  onRowClick,
  onBulkDelete,
  onBulkStatusChange,
  onBulkExport,
  statusOptions,
  searchPlaceholder = 'Search...',
  showDateFilter = false,
  getItemId
}: DataTableProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredData = data.filter((item) => {
    const searchMatch = searchTerm === '' || JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase());
    return searchMatch;
  });

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedData.map(getItemId)));
    }
  };

  const selectAllData = () => {
    setSelectedIds(new Set(filteredData.map(getItemId)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const getSelectedItems = () => {
    return data.filter((item) => selectedIds.has(getItemId(item)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        {showDateFilter && (
          <DateRangePicker
            from={dateFrom}
            to={dateTo}
            onDateChange={(from, to) => {
              setDateFrom(from);
              setDateTo(to);
            }}
          />
        )}
        <Select value={pageSize.toString()} onValueChange={(val) => setPageSize(Number(val))}>
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 rows</SelectItem>
            <SelectItem value="25">25 rows</SelectItem>
            <SelectItem value="50">50 rows</SelectItem>
            <SelectItem value="100">100 rows</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <BulkActionToolbar
        selectedCount={selectedIds.size}
        totalCount={filteredData.length}
        onSelectAll={selectAllData}
        onDeselectAll={deselectAll}
        onBulkDelete={onBulkDelete ? () => onBulkDelete(getSelectedItems()) : undefined}
        onBulkStatusChange={onBulkStatusChange ? (status) => onBulkStatusChange(getSelectedItems(), status) : undefined}
        onBulkExport={onBulkExport ? () => onBulkExport(getSelectedItems()) : undefined}
        statusOptions={statusOptions}
      />

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={paginatedData.length > 0 && selectedIds.size === paginatedData.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              {columns.map((column) => (
                <TableHead key={column.key}>{column.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="text-center py-8 text-muted-foreground">
                  No data found
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item) => {
                const id = getItemId(item);
                return (
                  <TableRow
                    key={id}
                    className={onRowClick ? 'cursor-pointer' : ''}
                    onClick={() => onRowClick?.(item)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(id)}
                        onCheckedChange={() => toggleSelection(id)}
                      />
                    </TableCell>
                    {columns.map((column) => (
                      <TableCell key={column.key}>{column.render(item)}</TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {paginatedData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
          {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} results
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
