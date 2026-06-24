import { useQuery } from "@tanstack/react-query";
import { useApiMutation } from "@/hooks/useApiMutation";
import { cantinaService } from "@/lib/cantina-service";
import type { Product } from "@/lib/api-types";

export function useProducts(page = 1, size = 50) {
  return useQuery({
    queryKey: ["products", page, size],
    queryFn: () => cantinaService.listProducts(page, size),
  });
}

export function useCreateProduct() {
  return useApiMutation<Product, Partial<Product>>({
    // Rezolvă eroarea 2322 prin alinierea tipului returnat cu interfața globală Product
    mutationFn: (data) => 
      cantinaService.createProduct(data) as unknown as Promise<Product>,
    invalidateKeys: [["products"]],
  });
}

export function useUpdateProduct() {
  return useApiMutation<Product, { id: number; data: Partial<Product> }>({
    // Rezolvă eroarea 2322 prin alinierea tipului returnat cu interfața globală Product
    mutationFn: ({ id, data }) =>
      cantinaService.updateProduct(id, data) as unknown as Promise<Product>,
    invalidateKeys: [["products"]],
  });
}

export function useDeleteProduct() {
  return useApiMutation<unknown, number>({
    mutationFn: (id) => cantinaService.deleteProduct(id),
    invalidateKeys: [["products"]],
  });
}

export function useMenus() {
  return useQuery({
    queryKey: ["menus"],
    queryFn: () => cantinaService.listMenus(),
  });
}

// ✅ HOOK-UL NOU DE CARE AI NEVOIE PENTRU SALVAREA ZILELOR ÎN MODAL!
export function useUpdateMenu() {
  return useApiMutation<unknown, { id: number; productIds: number[] }>({
    mutationFn: ({ id, productIds }) => 
      cantinaService.updateMenu(id, productIds),
    invalidateKeys: [["menus"], ["products"]], // Forțează reîncărcarea datelor pe ecran
  });
}