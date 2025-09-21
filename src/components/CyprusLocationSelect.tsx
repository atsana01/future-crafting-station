import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CyprusLocationSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  fieldLabel?: string;
}

const cyprusLocations = [
  // Nicosia District
  'Nicosia',
  'Aglantzia, Nicosia',
  'Engomi, Nicosia', 
  'Strovolos, Nicosia',
  'Latsia, Nicosia',
  'Dali, Nicosia',
  'Tseri, Nicosia',
  'Kokkinotrimithia, Nicosia',
  
  // Limassol District  
  'Limassol',
  'Germasogeia, Limassol',
  'Agios Athanasios, Limassol',
  'Mesa Geitonia, Limassol',
  'Polemidia, Limassol',
  'Ypsonas, Limassol',
  'Mouttagiaka, Limassol',
  'Agios Tychon, Limassol',
  'Potamos Germasogeias, Limassol',
  'Parekklisia, Limassol',
  'Erimi, Limassol',
  
  // Larnaca District
  'Larnaca',
  'Aradippou, Larnaca',
  'Livadia, Larnaca',
  'Oroklini, Larnaca',
  'Dhekelia, Larnaca',
  'Pervolia, Larnaca',
  'Kiti, Larnaca',
  
  // Paphos District
  'Paphos',
  'Kato Paphos, Paphos',
  'Chlorakas, Paphos',
  'Emba, Paphos',
  'Tala, Paphos',
  'Kissonerga, Paphos',
  'Peyia, Paphos',
  'Coral Bay, Paphos',
  
  // Famagusta District  
  'Famagusta',
  'Ayia Napa, Famagusta',
  'Protaras, Famagusta',
  'Paralimni, Famagusta',
  'Sotira, Famagusta',
  'Frenaros, Famagusta'
];

const CyprusLocationSelect: React.FC<CyprusLocationSelectProps> = ({
  value,
  onChange,
  placeholder = "Select location...",
  fieldLabel
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

  const filteredLocations = cyprusLocations.filter(location =>
    location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectLocation = (location: string) => {
    onChange(location);
    setIsOpen(false);
    setSearchTerm('');
  };

  const getDisplayText = () => {
    if (value) return value;
    return placeholder;
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
        <div className="flex-1 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className={cn(
            "flex-1",
            !value && "text-muted-foreground"
          )}>
            {getDisplayText()}
          </span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-border">
            <input
              ref={inputRef}
              type="text"
              placeholder="Type to search locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 text-sm border-0 bg-transparent focus:outline-none focus:ring-0"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredLocations.length > 0 ? (
              filteredLocations.map(location => (
                <div
                  key={location}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent",
                    value === location && "bg-accent/50 font-medium"
                  )}
                  onClick={() => selectLocation(location)}
                >
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span>{location}</span>
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                No locations found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CyprusLocationSelect;