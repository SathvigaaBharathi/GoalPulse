import { create } from 'zustand';
import axios from 'axios';
import useAuthStore from './useAuthStore';

const useCycleStore = create((set) => ({
  window: { phase: null, isOpen: false },
  loading: true,
  fetchWindow: async () => {
    try {
      const { token } = useAuthStore.getState();
      if (!token) return;
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.get(`${apiUrl}/api/cycles/active/window`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ window: res.data, loading: false });
    } catch (err) {
      console.error('Failed to fetch cycle window', err);
      set({ loading: false });
    }
  }
}));

export default useCycleStore;
