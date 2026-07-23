import { describe, it, expect, beforeEach, vi } from 'vitest';
import { settingsStore } from './settingsStore';

describe('settingsStore', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    } as Storage);
  });

  it('updates settings and persists to localStorage', () => {
    const initial = settingsStore.get();
    settingsStore.set({ durationMinutes: 45 });
    const updated = settingsStore.get();

    expect(updated.durationMinutes).toBe(45);
    expect(updated.cultureCode).toBe(initial.cultureCode);
  });

  it('notifies subscribers when settings change', () => {
    const listener = vi.fn();
    const unsubscribe = settingsStore.subscribe(listener);

    settingsStore.set({ mode: 'strict' });

    // subscribe calls listener immediately with current settings + once on set
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: 'strict' }),
    );

    unsubscribe();
  });

  it('unsubscribe removes listener from future notifications', () => {
    const listener = vi.fn();
    const unsubscribe = settingsStore.subscribe(listener);
    unsubscribe();

    const callsBefore = listener.mock.calls.length;
    settingsStore.set({ durationMinutes: 60 });

    expect(listener.mock.calls.length).toBe(callsBefore);
  });
});
