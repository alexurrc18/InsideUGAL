import type { z } from "zod";

import type {
  announcementSchema,
  courseSchema,
  enrollmentSchema,
  facultySchema,
  professorSchema,
  studentSchema,
  userSchema,
} from "./api-schemas";

export type User = z.infer<typeof userSchema>;
export type Faculty = z.infer<typeof facultySchema>;
export type Student = z.infer<typeof studentSchema>;
export type Professor = z.infer<typeof professorSchema>;
export type Course = z.infer<typeof courseSchema>;
export type Announcement = z.infer<typeof announcementSchema>;
export type Product = {
  id: number;
  name: string;

  // backend field (string sau category name)
  category: string;

  description: string | null;

  // KEEP compatibil backend (NU îl folosești în UI)
  quantity: string;

  // UI field (mapat din quantity sau alt field)
  weight?: string;

  price: number;

  nutritional_values?: string | null;

  created_at?: string;
  updated_at?: string;
};

export type DailyMenu = {
  id: number;
  day_of_week: number;
  products: Product[];
};

export type Dish = Product; // Alias for backward compatibility if needed
export type Enrollment = z.infer<typeof enrollmentSchema>;

export type ApiErrorBody = {
  code?: string;
  message: string;
  status?: number;
};

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};


// Adaugă la sfârșitul fișierului tău api-types.ts:

export type TicketStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'; 
// Notă: Înlocuiește valorile de mai sus dacă backend-ul tău folosește alte denumiri (ex: "ACTIVA", "REZOLVATA")

export type ComplaintTicket = {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  faculty?: string | null;
  created_at?: string;
  updated_at?: string;
};