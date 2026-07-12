
import { apiService } from './api';

export interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
}

export const contactApi = {
  submit: (data: { name: string; email: string; message: string }) =>
    apiService.post<{ success: boolean }>('/contact', data),
  getAll: () => apiService.get<ContactMessage[]>('/contact'),
};


