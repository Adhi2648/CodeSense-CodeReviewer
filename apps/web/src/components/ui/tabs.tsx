import { cn } from "@/lib/utils";

export interface TabOption {
  value: string;
  label: string;
}

interface TabsProps {
  value: string;
  onChange: (value: string) => void;
  options: TabOption[];
  className?: string;
}

export const Tabs = ({ value, onChange, options, className }: TabsProps): JSX.Element => (
  <div className={cn("inline-flex rounded-lg border border-border bg-card p-1", className)}>
    {options.map((tab) => (
      <button
        key={tab.value}
        type="button"
        onClick={() => onChange(tab.value)}
        className={cn(
          "rounded-md px-3 py-1.5 text-sm transition",
          value === tab.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        {tab.label}
      </button>
    ))}
  </div>
);
