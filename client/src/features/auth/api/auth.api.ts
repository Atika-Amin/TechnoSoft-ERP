import { api } from '../../../lib/axios';

export interface LoginRequest {
  username: string;
  password: string;
  workingYear: string;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: number;
    username: string;
    fullName: string;
    role: string;
  };
}

export const login = (body: LoginRequest) =>
  api.post<LoginResponse>('/auth/login', body).then((res) => res.data);
