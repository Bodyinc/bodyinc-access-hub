import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database } from "lucide-react";

export function LocalStorageBanner() {
  return (
    <Alert className="border-amber-500/30 bg-amber-500/5">
      <Database className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-900 dark:text-amber-200">
        Data is stored locally in your browser. Changes won&apos;t sync across devices until
        database wiring is enabled.
      </AlertDescription>
    </Alert>
  );
}
