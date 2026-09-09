import { create } from 'zustand';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  variant?: 'default' | 'success' | 'error';
}

interface UiState {
  toasts: Toast[];
  pushToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  pushToast: (toast) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 5000);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
