import { api } from '../../../lib/axios';

// Company details (old "profile" table), printed on every report
export interface Company {
  name: string;
  address1: string;
  address2: string;
  address3: string;
  nature: string;
  phone: string;
}

export const getCompany = () => api.get<Company>('/company').then((r) => r.data);
export const saveCompany = (c: Company) => api.put<Company>('/company', c).then((r) => r.data);
