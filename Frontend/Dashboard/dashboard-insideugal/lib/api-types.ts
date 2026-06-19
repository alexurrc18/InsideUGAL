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
export type Dish = {
  id: number;
  name: string;
  description: string | null;
  quantity: string;
  price: string;
  available_days?: string[];
  [key: string]: unknown; // Permisivitate pentru câmpuri extra venite din backend
};
export type Enrollment = z.infer<typeof enrollmentSchema>;

export type ApiErrorBody = {
  code?: string;
  message: string;
  status?: number;
};

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};
