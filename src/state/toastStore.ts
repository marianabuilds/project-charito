type ToastListener = (message: string) => void;
const listeners = new Set<ToastListener>();

export const toastStore = {
  show(message: string): void {
    listeners.forEach((l) => l(message));
  },
  subscribe(listener: ToastListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
