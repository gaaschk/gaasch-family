// Auth.js type augmentation
declare module 'next-auth' {
  interface User    { role: string }
  interface Session {
    user: {
      id:    string;
      role:  string;
      email: string;
      name?: string | null;
      image?: string | null;
    }
  }
}

// Matches Prisma Person model (returned from API)
export interface Person {
  id: string;
  name: string;
  sex: string | null;
  birthDate: string | null;
  birthPlace: string | null;
  deathDate: string | null;
  deathPlace: string | null;
  burialPlace: string | null;
  burialDate: string | null;
  occupation: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// Matches Prisma Family model (returned from API)
export interface Family {
  id: string;
  husbId: string | null;
  wifeId: string | null;
  marrDate: string | null;
  marrPlace: string | null;
  createdAt: string;
  updatedAt: string;
  husband?: Person | null;
  wife?: Person | null;
  children?: FamilyChild[];
}

export interface FamilyChild {
  familyId: string;
  personId: string;
  person?: Person;
}

export type UserRole = 'admin' | 'editor' | 'viewer' | 'pending';

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

// API response wrappers
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiError {
  error: string;
  status?: number;
}
