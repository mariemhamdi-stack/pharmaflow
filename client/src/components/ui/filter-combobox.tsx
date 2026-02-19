import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  options: string[] | FilterOption[];
  placeholder?: string;
  allLabel?: string;
  className?: string;
  testId?: string;
}

function normalizeOptions(options: string[] | FilterOption[]): FilterOption[] {
  if (options.length === 0) return [];
  if (typeof options[0] === "string") {
    return (options as string[]).map((o) => ({ value: o, label: o }));
  }
  return options as FilterOption[];
}

export function FilterCombobox({
  value,
  onValueChange,
  options,
  placeholder = "Filtrer...",
  allLabel = "Tous",
  className,
  testId,
}: FilterComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const normalizedOptions = normalizeOptions(options);

  const filteredOptions = normalizedOptions.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = normalizedOptions.find((o) => o.value === value);
  const displayLabel = value === "all" ? allLabel : selectedOption?.label || value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between gap-2 font-normal", className)}
          data-testid={testId}
        >
          <span className={cn("truncate text-left", value === "all" && "text-muted-foreground")}>
            {displayLabel}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder={placeholder}
            data-testid={testId ? `${testId}-search` : undefined}
          />
          <CommandList>
            <CommandEmpty>Aucun résultat</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="all"
                onSelect={() => {
                  onValueChange("all");
                  setOpen(false);
                  setSearch("");
                }}
                className="gap-2"
                data-testid={testId ? `${testId}-option-all` : undefined}
              >
                <Check className={cn("h-4 w-4 shrink-0", value === "all" ? "opacity-100" : "opacity-0")} />
                <span>{allLabel}</span>
              </CommandItem>
              {filteredOptions.map((opt, idx) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => {
                    onValueChange(opt.value);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="gap-2"
                  data-testid={testId ? `${testId}-option-${idx}` : undefined}
                >
                  <Check className={cn("h-4 w-4 shrink-0", value === opt.value ? "opacity-100" : "opacity-0")} />
                  <span>{opt.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
