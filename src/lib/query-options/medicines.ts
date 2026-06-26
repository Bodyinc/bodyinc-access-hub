import { queryOptions } from "@tanstack/react-query";
import { getMedicine, listMedicines } from "@/lib/medicines.store";

const LOCAL_STALE = Number.POSITIVE_INFINITY;

export const medicinesQueryKey = ["medicines"] as const;

export function medicinesQueryOptions() {
  return queryOptions({
    queryKey: medicinesQueryKey,
    queryFn: () => listMedicines(),
    staleTime: LOCAL_STALE,
  });
}

export function medicineQueryOptions(id: string) {
  return queryOptions({
    queryKey: ["medicine", id] as const,
    queryFn: () => getMedicine(id),
    staleTime: LOCAL_STALE,
  });
}
