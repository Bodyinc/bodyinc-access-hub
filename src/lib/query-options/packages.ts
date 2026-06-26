import { queryOptions } from "@tanstack/react-query";
import { listMedicines } from "@/lib/medicines.store";
import {
  getPackage,
  listPackages,
  type ListPackagesInput,
} from "@/lib/packages.store";

const LOCAL_STALE = Number.POSITIVE_INFINITY;

export const packagesQueryKey = ["packages"] as const;

function medicineNameMap() {
  return new Map(listMedicines().map((m) => [m.id, m.name]));
}

export function packagesQueryOptions(input: ListPackagesInput = {}) {
  return queryOptions({
    queryKey: packagesQueryKey,
    queryFn: () => listPackages(input, medicineNameMap()),
    staleTime: LOCAL_STALE,
  });
}

export function packageQueryOptions(id: string) {
  return queryOptions({
    queryKey: ["package", id] as const,
    queryFn: () => getPackage(id),
    staleTime: LOCAL_STALE,
  });
}
