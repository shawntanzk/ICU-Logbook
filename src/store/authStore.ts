import { create } from 'zustand';

export type UserRole = 'trainee' | 'supervisor';

interface AuthStore {
  isLoggedIn: boolean;
  role: UserRole | null;
  userName: string;
  login: (name: string, role: UserRole) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  isLoggedIn: false,
  role: null,
  userName: '',

  login: (name, role) => set({ isLoggedIn: true, role, userName: name }),
  logout: () => set({ isLoggedIn: false, role: null, userName: '' }),
}));
