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

interface FilterComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  allLabel?: string;
  className?: string;
  testId?: string;
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

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  const displayLabel = value === "all" ? allLabel : value;

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
                  key={opt}
                  value={opt}
                  onSelect={() => {
                    onValueChange(opt);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="gap-2"
                  data-testid={testId ? `${testId}-option-${idx}` : undefined}
                >
                  <Check className={cn("h-4 w-4 shrink-0", value === opt ? "opacity-100" : "opacity-0")} />
                  <span>{opt}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
