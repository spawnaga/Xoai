export type UserRole = 'ADMIN' | 'DOCTOR' | 'NURSE' | 'PATIENT' | 'USER';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  image?: string;
}

export interface Session {
  user: User;
  expires: Date;
  accessToken?: string;
}

export interface AuthProvider {
  id: string;
  name: string;
  type: 'oauth' | 'credentials';
}

export interface SessionConfig {
  strategy: 'jwt' | 'database';
  maxAge: number;
  updateAge: number;
}

export interface AuthConfig {
  providers: AuthProvider[];
  session: SessionConfig;
  pages?: {
    signIn?: string;
    signOut?: string;
    error?: string;
  };
}

export interface Permission {
  resource: string;
  actions: ('create' | 'read' | 'update' | 'delete')[];
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
}
