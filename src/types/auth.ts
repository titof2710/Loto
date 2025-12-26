export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface Session {
  userId: string;
  email: string;
}

export interface AuthResponse {
  success: boolean;
  error?: string;
  userId?: string;
}
