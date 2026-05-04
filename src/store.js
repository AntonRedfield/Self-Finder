import { create } from 'zustand';

export const useStore = create((set) => ({
  token: null,
  userDetails: null,
  assessmentData: null,
  isAdminAuthenticated: false,
  setToken: (token) => set({ token }),
  setUserDetails: (details) => set({ userDetails: details }),
  setAssessmentData: (data) => set({ assessmentData: data }),
  clearSession: () => set({ token: null, userDetails: null, assessmentData: null }),
  adminLogin: (id, password) => {
    if (id === 'master@self.finder' && password === 'master@sf12') {
      set({ isAdminAuthenticated: true });
      return true;
    }
    return false;
  },
  adminLoginDirect: () => set({ isAdminAuthenticated: true }),
  adminLogout: () => set({ isAdminAuthenticated: false })
}));
