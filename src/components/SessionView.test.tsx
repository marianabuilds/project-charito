import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SessionView } from './SessionView';
import type { DetoxSettings } from '../types/settings';

vi.mock('../state/settingsStore', () => {
  const settings: DetoxSettings = {
    durationMinutes: 30,
    cultureCode: 'pe_PE',
    languageCode: 'es-PE',
    mode: 'gentle',
    voiceActorId: 'sofia',
    selectedMessageId: 'pe_oye_compadre',
    customMessages: [],
    userName: '',
    goals: [],
    preBlockReminderMinutes: 10,
    blockExceptions: ['Phone', 'Messages'],
  };
  return {
    settingsStore: {
      get: () => settings,
      subscribe: (listener: (s: DetoxSettings) => void) => {
        listener(settings);
        return () => {};
      },
      set: vi.fn(),
    },
  };
});

vi.mock('../services/audioEngine', () => ({
  isSupported: () => true,
  speak: vi.fn().mockResolvedValue(undefined),
}));

describe('SessionView', () => {
  it('renders start session button when idle', () => {
    render(<SessionView />);
    expect(screen.getByText(/Start session/i)).toBeInTheDocument();
  });

  it('shows countdown timer display', () => {
    render(<SessionView />);
    // Should show 30:00 for a 30-minute session
    expect(screen.getByText('30:00')).toBeInTheDocument();
  });

  it('shows mode label', () => {
    render(<SessionView />);
    expect(screen.getByText(/Gentle/i)).toBeInTheDocument();
  });

  it('shows reset button after session starts', () => {
    render(<SessionView />);
    fireEvent.click(screen.getByText(/Start session/i));
    expect(screen.getByText(/Reset/i)).toBeInTheDocument();
  });
});
