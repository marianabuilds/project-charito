import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isSupported, speak } from './audioEngine';

describe('audioEngine', () => {
  beforeEach(() => {
    function MockUtterance(this: { lang: string; onend: (() => void) | null; onerror: ((e: unknown) => void) | null; text: string }, text: string) {
      this.text = text;
      this.lang = '';
      this.onend = null;
      this.onerror = null;
    }
    vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance);

    vi.stubGlobal('speechSynthesis', {
      speak: vi.fn((utterance: { onend: (() => void) | null }) => {
        // Trigger onend asynchronously to resolve the promise
        Promise.resolve().then(() => utterance.onend?.());
      }),
      cancel: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports support when speechSynthesis is available', () => {
    expect(isSupported()).toBe(true);
  });

  it('reports no support when speechSynthesis is absent', () => {
    vi.stubGlobal('speechSynthesis', undefined);
    expect(isSupported()).toBe(false);
  });

  it('invokes speechSynthesis.speak with utterance', async () => {
    await speak('test', 'en-US');
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
  });

  it('resolves immediately when speech synthesis is unsupported', async () => {
    vi.stubGlobal('speechSynthesis', undefined);
    await expect(speak('test', 'en-US')).resolves.toBeUndefined();
  });
});
