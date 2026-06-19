import { z } from "zod";
import { apiRequest } from "./api-client";
import type { Dish } from "./api-types";

export const cantinaService = {
  list: (dayOfWeek?: number) => {
    const url = dayOfWeek ? `/cafeteria_menus/?day_of_week=${dayOfWeek}` : "/cafeteria_menus/";
    return apiRequest(url, z.any());
  },

  create: (data: Partial<Dish>) =>
    apiRequest("/cafeteria_menus/", z.any(), {
      method: "POST",
      body: data,
    }),

  update: (id: string | number, data: Partial<Dish>) =>
    apiRequest(`/cafeteria_menus/${id}`, z.any(), {
      method: "PATCH",
      body: data,
    }),

  delete: (id: string | number) =>
    apiRequest(`/cafeteria_menus/${id}`, z.any(), {
      method: "DELETE",
    }),
};
