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
  treeId: string | null;
  gedcomId: string | null;
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
  narrative: string | null;
  createdAt: string;
  updatedAt: string;
}

// Matches Prisma Family model (returned from API)
export interface Family {
  id: string;
  treeId: string | null;
  gedcomId: string | null;
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
export type TreeRole = 'admin' | 'editor' | 'viewer';

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

// Tree models
export interface Tree {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TreeMember {
  id: string;
  treeId: string;
  userId: string;
  role: TreeRole;
  joinedAt: string;
  user?: UserProfile;
}

export interface TreeInvite {
  id: string;
  treeId: string;
  email: string;
  role: TreeRole;
  token: string;
  invitedBy: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
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
