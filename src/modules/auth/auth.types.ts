export interface LoginBody {
  email?: string;
  phone?: string;
  password: string;
}

export interface RegisterBody {
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  email?: string;
  code: string;
  avatar?: string;
}

export interface SendCodeBody {
  phone: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email?: string;
    phone?: string;
    name?: string;
    role: string;
    emailVerified: boolean;
    phoneVerified: boolean;
  };
}
