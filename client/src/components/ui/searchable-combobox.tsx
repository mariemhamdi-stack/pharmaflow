import { useState, useRef, useCallback, useEffect } from "react";
import { Check, ChevronsUpDown, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

interface SearchableComboboxProps {
  value: string;
  displayValue: string;
  onSelect: (id: string, label: string) => void;
  searchUrl: string;
  placeholder?: string;
  testId?: string;
  renderItem?: (item: any) => string;
  disabled?: boolean;
}

export function SearchableCombobox({
  value,
  displayValue,
  onSelect,
  searchUrl,
  placeholder = "Rechercher...",
  testId = "combobox",
  renderItem,
  disabled = false,
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setResults([]);
        setHasSearched(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`${searchUrl}${encodeURIComponent(q)}`, {
          credentials: "include",
        });
        const data = await res.json();
        setResults(data);
        setHasSearched(true);
      } catch {
        setResults([]);
      }
      setLoading(false);
    },
    [searchUrl]
  );

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(val), 250);
  };

  const handleSelect = (item: any) => {
    const label = renderItem ? renderItem(item) : item.nom;
    onSelect(item.id, label);
    setSearch("");
    setResults([]);
    setHasSearched(false);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect("", "");
    setSearch("");
    setResults([]);
    setHasSearched(false);
  };

  useEffect(() => {
    if (!open) {
      setSearch("");
      setResults([]);
      setHasSearched(false);
    }
  }, [open]);

  const getItemLabel = (item: any) =>
    renderItem ? renderItem(item) : item.nom;

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between gap-2 flex-wrap font-normal"
            data-testid={testId}
          >
            {value && displayValue ? (
              <span className="truncate flex-1 text-left">{displayValue}</span>
            ) : (
              <span className="text-muted-foreground truncate flex-1 text-left">
                {placeholder}
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0 w-[--radix-popover-trigger-width]"
          align="start"
        >
          <Command shouldFilter={false}>
            <div className="relative">
              <CommandInput
                value={search}
                onValueChange={handleSearchChange}
                placeholder={placeholder}
                data-testid={`${testId}-input`}
              />
              {loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin opacity-50" />
                </div>
              )}
            </div>
            <CommandList>
              {!loading && hasSearched && results.length === 0 && (
                <CommandEmpty>Aucun résultat</CommandEmpty>
              )}
              {!hasSearched && !loading && (
                <CommandEmpty>Tapez pour rechercher...</CommandEmpty>
              )}
              {results.length > 0 && (
                <CommandGroup>
                  {results.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => handleSelect(item)}
                      className="gap-2"
                      data-testid={`${testId}-option-${item.id}`}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          value === item.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="truncate">{getItemLabel(item)}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleClear}
          data-testid={`${testId}-clear`}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
