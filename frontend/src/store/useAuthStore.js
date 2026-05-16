import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('goalpulse_user')) || null,
  token: localStorage.getItem('goalpulse_token') || null,
  login: (user, token) => {
    localStorage.setItem('goalpulse_user', JSON.stringify(user));
    localStorage.setItem('goalpulse_token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('goalpulse_user');
    localStorage.removeItem('goalpulse_token');
    set({ user: null, token: null });
  },
  // Novelty: Switch roles for demo purposes
  switchRole: (newRole) => {
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { ...state.user, role: newRole };
      // Assign fake ID depending on role for demo realism
      if (newRole === 'admin') updatedUser.id = 1;
      else if (newRole === 'manager') updatedUser.id = 2;
      else if (newRole === 'employee') updatedUser.id = 3;
      
      localStorage.setItem('goalpulse_user', JSON.stringify(updatedUser));
      return { user: updatedUser };
    });
  }
}));

export default useAuthStore;
