import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useAdminPeriod, PeriodPreset } from '@/contexts/AdminPeriodContext';
import { useState } from 'react';

export const PeriodSelector = () => {
  const { preset, dateRange, setPreset, setCustomRange } = useAdminPeriod();
  const [isOpen, setIsOpen] = useState(false);
  const [tempFrom, setTempFrom] = useState<Date | undefined>(dateRange.from);
  const [tempTo, setTempTo] = useState<Date | undefined>(dateRange.to);

  const presets: { value: PeriodPreset; label: string }[] = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: 'qtd', label: 'Quarter to date' },
    { value: 'ytd', label: 'Year to date' },
    { value: 'custom', label: 'Custom range' },
  ];

  const handlePresetClick = (value: PeriodPreset) => {
    if (value !== 'custom') {
      setPreset(value);
    }
  };

  const handleCustomApply = () => {
    if (tempFrom && tempTo) {
      setCustomRange(tempFrom, tempTo);
      setIsOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {presets.filter(p => p.value !== 'custom').map((p) => (
        <Button
          key={p.value}
          variant={preset === p.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => handlePresetClick(p.value)}
        >
          {p.label}
        </Button>
      ))}
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant={preset === 'custom' ? 'default' : 'outline'} size="sm">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {preset === 'custom' 
              ? `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}`
              : 'Custom'
            }
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <Calendar
                mode="single"
                selected={tempFrom}
                onSelect={setTempFrom}
                initialFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <Calendar
                mode="single"
                selected={tempTo}
                onSelect={setTempTo}
                disabled={(date) => tempFrom ? date < tempFrom : false}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setIsOpen(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleCustomApply} className="flex-1" disabled={!tempFrom || !tempTo}>
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
