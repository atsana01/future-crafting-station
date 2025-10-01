import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DateRangePickerProps {
  from?: Date;
  to?: Date;
  onDateChange: (from?: Date, to?: Date) => void;
}

export const DateRangePicker = ({ from, to, onDateChange }: DateRangePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempFrom, setTempFrom] = useState<Date | undefined>(from);
  const [tempTo, setTempTo] = useState<Date | undefined>(to);

  const handleApply = () => {
    onDateChange(tempFrom, tempTo);
    setIsOpen(false);
  };

  const handleClear = () => {
    setTempFrom(undefined);
    setTempTo(undefined);
    onDateChange(undefined, undefined);
    setIsOpen(false);
  };

  const displayText = from && to
    ? `${format(from, 'MMM dd, yyyy')} - ${format(to, 'MMM dd, yyyy')}`
    : from
    ? `From ${format(from, 'MMM dd, yyyy')}`
    : 'Select date range';

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn('justify-start text-left font-normal', !from && 'text-muted-foreground')}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">From Date</label>
            <Calendar
              mode="single"
              selected={tempFrom}
              onSelect={setTempFrom}
              initialFocus
              className="pointer-events-auto"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">To Date</label>
            <Calendar
              mode="single"
              selected={tempTo}
              onSelect={setTempTo}
              disabled={(date) => tempFrom ? date < tempFrom : false}
              className="pointer-events-auto"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleClear} variant="outline" className="flex-1">
              Clear
            </Button>
            <Button onClick={handleApply} className="flex-1">
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
