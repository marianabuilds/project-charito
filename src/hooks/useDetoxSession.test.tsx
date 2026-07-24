import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDetoxSession } from './useDetoxSession';
import type { DetoxSettings } from '../types/settings';

// Shared mutable settings so individual tests can override.
let mockSettings: DetoxSettings = {
  durationMinutes: 0.5, // 30 seconds — fast enough for timer tests
  cultureCode: 'pe_PE',
  languageCode: 'es-PE',
  mode: 'gentle',
  selectedMessageId: null,
  customMessages: [],
  userName: '',
  goals: [],
};

vi.mock('../state/settingsStore', () => ({
  settingsStore: {
    get: () => mockSettings,
    subscribe: (listener: (s: DetoxSettings) => void) => {
      listener(mockSettings);
      return () => {};
    },
    set: vi.fn(),
  },
}));

const mockSpeak = vi.fn().mockResolvedValue(undefined);

vi.mock('../services/audioEngine', () => ({
  isSupported: () => true,
  speak: (...args: unknown[]) => mockSpeak(...args),
}));

function advanceTimersBySeconds(seconds: number) {
  act(() => {
    vi.advanceTimersByTime(seconds * 1000);
  });
}

describe('useDetoxSession', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSpeak.mockClear();
    mockSettings = {
      durationMinutes: 0.5,
      cultureCode: 'pe_PE',
      languageCode: 'es-PE',
      mode: 'gentle',
      selectedMessageId: null,
      customMessages: [],
      userName: '',
      goals: [],
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in idle status', () => {
    const { result } = renderHook(() => useDetoxSession());
    expect(result.current.status).toBe('idle');
  });

  it('counts down and completes after duration', () => {
    const { result } = renderHook(() => useDetoxSession());

    act(() => {
      result.current.start();
    });

    expect(result.current.status).toBe('running');

    // Advance past the 30-second session
    advanceTimersBySeconds(31);

    expect(result.current.status).toBe('completed');
  });

  it('speaks a completion reminder when session ends', () => {
    const { result } = renderHook(() => useDetoxSession());

    act(() => {
      result.current.start();
    });

    advanceTimersBySeconds(31);

    expect(mockSpeak).toHaveBeenCalled();
  });

  it('pauses and resumes the session', () => {
    const { result } = renderHook(() => useDetoxSession());

    act(() => {
      result.current.start();
    });

    advanceTimersBySeconds(5);

    act(() => {
      result.current.pause();
    });

    expect(result.current.status).toBe('paused');
    const elapsed = result.current.elapsedSeconds;

    advanceTimersBySeconds(5);
    expect(result.current.elapsedSeconds).toBe(elapsed); // no change while paused

    act(() => {
      result.current.resume();
    });

    expect(result.current.status).toBe('running');
  });

  it('reset returns to idle and clears elapsed time', () => {
    const { result } = renderHook(() => useDetoxSession());

    act(() => {
      result.current.start();
    });

    advanceTimersBySeconds(10);

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.elapsedSeconds).toBe(0);
  });
});
