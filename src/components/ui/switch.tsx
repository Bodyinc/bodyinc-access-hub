import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    ref={ref}
    {...props}
    className={cn(
      "peer inline-flex h-[26px] w-[44px] shrink-0 cursor-pointer items-center rounded-[13px] border border-transparent bg-[#D5DEDD] p-[3px] shadow-none transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#152A51]/20 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[#6A9B9C]",
      className,
    )}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-[20px] w-[20px] rounded-full bg-white shadow-none transition-transform duration-200 data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-0",
      )}
    />
  </SwitchPrimitives.Root>
));

Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
