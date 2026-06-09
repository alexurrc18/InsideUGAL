// app/data/users.ts
export type UserRole = "STUDENT" | "PROFESOR" | "ADMIN";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  faculty: string;
  status: "activ" | "inactiv";
}

export const mockUsers: User[] = [
  {
    id: "u1",
    firstName: "Alexandru",
    lastName: "Popescu",
    email: "alex.popescu@student.ugal.ro",
    role: "STUDENT",
    faculty: "ACIEE",
    status: "activ",
  },
  {
    id: "u2",
    firstName: "Maria",
    lastName: "Ionescu",
    email: "maria.ionescu@prof.ugal.ro",
    role: "PROFESOR",
    faculty: "FL",
    status: "activ",
  },
  {
    id: "u3",
    firstName: "Andrei",
    lastName: "Radu",
    email: "andrei.radu@admin.ugal.ro",
    role: "ADMIN",
    faculty: "Administrație",
    status: "activ",
  },
  {
    id: "u4",
    firstName: "Elena",
    lastName: "Dumitru",
    email: "elena.dumitru@student.ugal.ro",
    role: "STUDENT",
    faculty: "FEAA",
    status: "inactiv",
  },
];
