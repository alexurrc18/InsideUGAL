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
  title: z.string(),
  content: z.string(),
  created_by: z.union([z.number().int(), z.string()]), // Acceptă atât ID-uri numerice cât și UUID-uri/Usernames
  is_pinned: z.boolean().default(false),
  expires_at: isoDateSchema.nullable().optional(),
  created_at: isoDateSchema,
  updated_at: isoDateSchema,
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
export const facultiesSchema = z.array(facultySchema);
export const studentsSchema = z.array(studentSchema);
export const professorsSchema = z.array(professorSchema);
export const coursesSchema = z.array(courseSchema);
export const announcementsSchema = createPaginatedResponseSchema(announcementSchema);
export const enrollmentsSchema = z.array(enrollmentSchema);
