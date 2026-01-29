export interface LoginBody {
  email: string;
  password: string;
}

export interface RegisterBody extends LoginBody {
  role?: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}
