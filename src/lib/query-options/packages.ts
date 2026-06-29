import { queryOptions } from "@tanstack/react-query";
import {
  getPackage,
  listPackages,
  type ListPackagesInput,
} from "@/lib/packages.store";

const LOCAL_STALE = Number.POSITIVE_INFINITY;

export const packagesQueryKey = ["packages"] as const;

export function packagesQueryOptions(input: ListPackagesInput = {}) {
  return queryOptions({
    queryKey: packagesQueryKey,
    queryFn: () => listPackages(input),
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
