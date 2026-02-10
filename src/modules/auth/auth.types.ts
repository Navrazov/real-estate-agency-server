export interface LoginBody {
  email: string;
  password: string;
}

export interface RegisterBody extends LoginBody {
  name?: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name?: string;
    role: string;
    emailVerified: boolean;
  };
}
