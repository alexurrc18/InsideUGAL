import { useQuery } from "@tanstack/react-query";
import { useApiMutation } from "@/hooks/useApiMutation";
import { cantinaService } from "@/lib/cantina-service";
import type { Dish } from "@/lib/api-types";

export function useDishes(dayOfWeek?: number) {
  return useQuery({
    queryKey: ["dishes", dayOfWeek],
    queryFn: () => cantinaService.list(dayOfWeek),
  });
}

export function useCreateDish() {
  return useApiMutation<Dish, Partial<Dish>>({
    mutationFn: (data) => cantinaService.create(data),
    invalidateKeys: [["dishes"]],
  });
}

export function useUpdateDish() {
  return useApiMutation<Dish, { id: number | string; data: Partial<Dish> }>({
    mutationFn: ({ id, data }) => cantinaService.update(id, data),
    invalidateKeys: [["dishes"]],
  });
}

export function useDeleteDish() {
  return useApiMutation<unknown, string | number>({
    mutationFn: (id) => cantinaService.delete(id),
    invalidateKeys: [["dishes"]],
  });
}
