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
  phoneHidden?: boolean;
  birthDate?: string;
}

export interface SendCodeBody {
  phone: string;
  method?: 'call' | 'telegram';
  checkExists?: boolean;
  mustExist?: boolean;
}

export interface ResetPasswordBody {
  phone: string;
  code: string;
  newPassword: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    phone?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    role: string;
    phoneVerified: boolean;
    phoneHidden?: boolean;
  };
}
