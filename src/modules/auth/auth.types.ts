export interface LoginBody {
  phone: string;
  password: string;
}

export interface RegisterBody {
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  code: string;
}

export interface SendCodeBody {
  phone: string;
  method?: 'call' | 'telegram';
  checkExists?: boolean;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    phone?: string;
    name?: string;
    role: string;
    phoneVerified: boolean;
  };
}
