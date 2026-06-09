// app/data/faculties.ts
export interface Faculty {
  id: string;
  name: string;
  abbreviation: string;
  dean: string;
  address: string;
  website: string;
  studentsCount: number;
}

export const mockFaculties: Faculty[] = [
  {
    id: "1",
    name: "Facultatea de Automatică, Calculatoare, Inginerie Electrică și Electronică",
    abbreviation: "ACIEE",
    dean: "Prof. dr. ing. Marian Barbu",
    address: "Str. Științei nr. 2",
    website: "https://acieee.ugal.ro",
    studentsCount: 1200,
  },
  {
    id: "2",
    name: "Facultatea de Inginerie",
    abbreviation: "FI",
    dean: "Prof. dr. ing. Elena Mereuță",
    address: "Str. Domnească nr. 111",
    website: "https://ing.ugal.ro",
    studentsCount: 1500,
  },
  {
    id: "3",
    name: "Facultatea de Litere",
    abbreviation: "FL",
    dean: "Prof. dr. Doina Mihaela Popa",
    address: "Str. Domnească nr. 47",
    website: "https://litere.ugal.ro",
    studentsCount: 800,
  },
  {
    id: "4",
    name: "Facultatea de Economie și Administrarea Afacerilor",
    abbreviation: "FEAA",
    dean: "Prof. dr. habil. Adrian Micu",
    address: "Str. Nicolae Bălcescu nr. 59-61",
    website: "https://feaa.ugal.ro",
    studentsCount: 2000,
  },
];
