import { queryOptions } from "@tanstack/react-query";
import { getCategory, listCategories } from "@/lib/categories.store";

export const categoriesQueryKey = ["categories"] as const;

export function categoriesQueryOptions() {
  return queryOptions({
    queryKey: categoriesQueryKey,
    queryFn: () => listCategories(),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function categoryQueryOptions(id: string) {
  return queryOptions({
    queryKey: ["category", id] as const,
    queryFn: () => getCategory(id),
    staleTime: Number.POSITIVE_INFINITY,
  });
}