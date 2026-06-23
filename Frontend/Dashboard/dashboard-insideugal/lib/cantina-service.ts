import { z } from "zod";
import { apiRequest } from "./api-client";
import type { Product, DailyMenu } from "./api-types";
import {
  productSchema,
  dailyMenuSchema,
  productsSchema,
  dailyMenusSchema,
} from "./api-schemas";

export const cantinaService = {
  // PRODUCTS
listProducts: (page = 1, size = 50) => {
  const offset = (page - 1) * size;

  return apiRequest(
    `/products?offset=${offset}&limit=${size}`,
    productsSchema
  );
},

  createProduct: (data: Partial<Product>) =>
    apiRequest("/products", productSchema, {
      method: "POST",
      body: data,
    }),

  updateProduct: (id: number, data: Partial<Product>) =>
    apiRequest(`/products/${id}`, productSchema, {
      method: "PATCH",
      body: data,
    }),

  deleteProduct: (id: number) =>
    apiRequest(`/products/${id}`, z.any(), {
      method: "DELETE",
    }),

  // DAILY MENUS (FIXED ENDPOINT)
  listMenus: () => {
    return apiRequest(`/daily-menus`, dailyMenusSchema);
  },

  updateMenu: (id: number, productIds: number[]) =>
    apiRequest(`/daily-menus/${id}`, dailyMenuSchema, {
      method: "PATCH",
      body: { product_ids: productIds },
    }),
};