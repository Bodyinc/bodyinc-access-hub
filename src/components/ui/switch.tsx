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
      "peer inline-flex h-[36px] w-[62px] shrink-0 cursor-pointer items-center rounded-[10px] border border-[#E2DAFC] bg-[#FAF8FE] p-[4px] shadow-none transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E00AB] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-[28px] w-[28px] rounded-[7px] shadow-none transition-transform duration-200 data-[state=checked]:translate-x-[26px] data-[state=unchecked]:translate-x-0 data-[state=checked]:bg-[#2E00AB] data-[state=unchecked]:bg-[#DCD5FA]"
      )}
    />
  </SwitchPrimitives.Root>
));

Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };