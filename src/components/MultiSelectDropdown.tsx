import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MultiSelectDropdownProps {
  options: string[];
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
  placeholder?: string;
  maxDisplay?: number;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  selected,
  onSelectionChange,
  placeholder = "Select options...",
  maxDisplay = 2
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (option: string) => {
    const newSelected = selected.includes(option)
      ? selected.filter(item => item !== option)
      : [...selected, option];
    onSelectionChange(newSelected);
  };

  const removeOption = (option: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionChange(selected.filter(item => item !== option));
  };

  const getDisplayText = () => {
    if (selected.length === 0) return placeholder;
    if (selected.length <= maxDisplay) {
      return selected.join(', ');
    }
    return `${selected.slice(0, maxDisplay).join(', ')} +${selected.length - maxDisplay} more`;
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div
        className={cn(
          "flex min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          "hover:border-primary transition-colors",
          isOpen && "ring-2 ring-ring ring-offset-2"
        )}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
          }
        }}
      >
        <div className="flex-1 flex flex-wrap gap-1 items-center">
          {selected.length > 0 ? (
            <>
              {selected.slice(0, maxDisplay).map(option => (
                <span
                  key={option}
                  className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-medium"
                >
                  {option}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-3 w-3 p-0 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    onClick={(e) => removeOption(option, e)}
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </span>
              ))}
              {selected.length > maxDisplay && (
                <span className="text-xs text-muted-foreground">
                  +{selected.length - maxDisplay} more
                </span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-border">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search options..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 text-sm border-0 bg-transparent focus:outline-none focus:ring-0"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <div
                  key={option}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-accent",
                    selected.includes(option) && "bg-accent/50"
                  )}
                  onClick={() => toggleOption(option)}
                >
                  <span>{option}</span>
                  {selected.includes(option) && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;