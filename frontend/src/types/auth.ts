export interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_verified: boolean;
  subscription_tier: string;
  created_at: string;
  last_login_at: string | null;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
