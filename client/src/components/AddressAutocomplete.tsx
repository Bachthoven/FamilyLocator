import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddressSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  place_id: string;
  type: string;
  importance: number;
}

interface AddressAutocompleteProps {
  value: string;
  onValueChange: (value: string) => void;
  onLocationSelect: (location: { address: string; latitude: number; longitude: number }) => void;
  placeholder?: string;
  className?: string;
}

export default function AddressAutocomplete({
  value,
  onValueChange,
  onLocationSelect,
  placeholder = "Enter address...",
  className,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchSuggestions = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=5&addressdetails=1&extratags=1`,
        {
          headers: {
            'User-Agent': 'FamilyLocator-App',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const data: AddressSuggestion[] = await response.json();
      setSuggestions(data);
      setShowSuggestions(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (value) {
      timeoutRef.current = setTimeout(() => {
        fetchSuggestions(value);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onValueChange(newValue);
    if (newValue) {
      setShowSuggestions(true);
    }
  };

  const handleSuggestionClick = (suggestion: AddressSuggestion) => {
    const address = suggestion.display_name;
    const latitude = parseFloat(suggestion.lat);
    const longitude = parseFloat(suggestion.lon);

    onValueChange(address);
    onLocationSelect({ address, latitude, longitude });
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow for click events
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 200);
  };

  const formatDisplayName = (displayName: string) => {
    // Clean up the display name for better readability
    const parts = displayName.split(',');
    if (parts.length > 4) {
      return parts.slice(0, 4).join(', ') + '...';
    }
    return displayName;
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={() => value && suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          className={className}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1">
          <Command className="border rounded-md shadow-lg bg-popover">
            <CommandList>
              <CommandGroup>
                {suggestions.map((suggestion, index) => (
                  <CommandItem
                    key={suggestion.place_id}
                    className={cn(
                      "cursor-pointer",
                      index === selectedIndex && "bg-accent"
                    )}
                    onSelect={() => handleSuggestionClick(suggestion)}
                  >
                    <MapPin className="w-4 h-4 mr-2 flex-shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {formatDisplayName(suggestion.display_name)}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {suggestion.type?.replace('_', ' ') || 'Location'}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              {suggestions.length === 0 && !isLoading && (
                <CommandEmpty>No locations found</CommandEmpty>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}