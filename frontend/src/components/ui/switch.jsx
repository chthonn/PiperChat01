import * as React from "react";
import { cn } from "../../lib/utils";

const Switch = React.forwardRef(
  ({ className, checked, onCheckedChange, disabled, ...props }, ref) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      ref={ref}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center overflow-hidden rounded-full border-0 p-0.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
        "disabled:cursor-not-allowed disabled:opacity-50",
        !checked && "bg-white/20",
        className,
      )}
      {...props}
    >
      {checked && (
        <span
          className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
          aria-hidden
        />
      )}
      <span
        className={cn(
          "relative z-[1] block h-4 w-4 shrink-0 rounded-full bg-white",
          "transform-gpu transition-transform duration-200 ease-out",
          checked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  ),
);
Switch.displayName = "Switch";

export { Switch };
