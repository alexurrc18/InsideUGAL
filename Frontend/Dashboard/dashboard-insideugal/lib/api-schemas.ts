import { z } from "zod";

export const isoDateSchema = z.string().datetime({ offset: true });

export const userSchema = z.object({
  id: z.number().int(),
  email: z.string().email(),
  full_name: z.string(),
  is_active: z.boolean(),
  is_admin: z.boolean(),
  created_at: isoDateSchema,
  updated_at: isoDateSchema,
});

export const facultySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  abbreviation: z.string(),
  description: z.string().nullable(),
  logo_url: z.string().nullable().optional(),
  created_at: isoDateSchema,
  updated_at: isoDateSchema,
});

export const studentSchema = z.object({
  id: z.number().int(),
  user_id: z.number().int(),
  faculty_id: z.number().int().nullable(),
  year: z.number().int().nullable(),
  student_id: z.string().nullable(),
  created_at: isoDateSchema,
  updated_at: isoDateSchema,
});

export const professorSchema = z.object({
  id: z.number().int(),
  user_id: z.number().int(),
  faculty_id: z.number().int().nullable(),
  created_at: isoDateSchema,
  updated_at: isoDateSchema,
});

export const courseSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  faculty_id: z.number().int(),
  professor_id: z.number().int().nullable(),
  credits: z.number().int(),
  semester: z.number().int().nullable(),
  year: z.number().int().nullable(),
  created_at: isoDateSchema,
  updated_at: isoDateSchema,
});

export const announcementSchema = z.object({
  id: z.number().int(),
  type: z.enum(["NOUTATE", "EVENIMENT"]),
  title: z.string(),
  content: z.string(),
  created_by: z.union([z.number().int(), z.string()]),
  is_pinned: z.boolean().default(false),
  expires_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  faculty_id: z.number().int().nullable().optional(),
  location_name: z.string().nullable().optional(),
  faculties: z.array(facultySchema).optional().default([]), 
  event_link: z.string().nullable().optional(),             
});

export const paginatedAnnouncementsSchema = z.object({
  items: z.array(announcementSchema),
  total: z.number().int(),
  page: z.number().int(),
  size: z.number().int(),
  total_pages: z.number().int(),
});

export const enrollmentSchema = z.object({
  id: z.number().int(),
  student_id: z.number().int(),
  course_id: z.number().int(),
  grade: z.string().nullable(),
  enrolled_at: isoDateSchema.nullable(),
  created_at: isoDateSchema,
  updated_at: isoDateSchema,
});

export const apiErrorSchema = z.object({
  message: z.string(),
  status: z.number().int().optional(),
  code: z.string().optional(),
});

export const createPaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int(),
    page: z.number().int(),
    size: z.number().int(),
    total_pages: z.number().int(),
  });
  

export const usersSchema = z.array(userSchema);
export const facultiesSchema = createPaginatedResponseSchema(facultySchema);
export const studentsSchema = z.array(studentSchema);
export const professorsSchema = z.array(professorSchema);
export const coursesSchema = z.array(courseSchema);
export const announcementsSchema = createPaginatedResponseSchema(announcementSchema);
export const productSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  category: z.string().nullable().default("General"),
  description: z.string().nullable(),
  quantity: z.string(),
  price: z.union([z.number(), z.string()]).transform((val) => Number(val)),
  nutritional_values: z.string().nullable().optional(),
  created_at: isoDateSchema.optional(),
  updated_at: isoDateSchema.optional(),
});

export const dailyMenuSchema = z.object({
  id: z.number().int(),
  day_of_week: z.number().int(),
  products: z.array(productSchema),
});

export const productsSchema = z.union([
  z.object({
    items: z.array(productSchema),
    total: z.number().int().optional(),
  }),
  z.array(productSchema).transform((arr) => ({
    items: arr,
    total: arr.length,
  })),
]);

export const dailyMenusSchema = z.object({
  items: z.array(dailyMenuSchema),
  total: z.number().int(),
});

export const dishSchema = productSchema;
export const dishesSchema = productsSchema;

export const enrollmentsSchema = z.array(enrollmentSchema);

export const notificationSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  body: z.string(),
  action: z.string().nullable().optional(),
  faculty_id: z.number().int().nullable().optional(),
  sent_by: z.string(),
  sent_at: z.string(),
  recipient_count: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const notificationsSchema = createPaginatedResponseSchema(notificationSchema);

export const profileSchema = z.object({
  id: z.string(),
  username: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().email(),
  role: z.string(),
  is_active: z.boolean(),
  faculty_id: z.number().int().nullable().optional(),
  created_at: isoDateSchema,
  updated_at: isoDateSchema,
});

