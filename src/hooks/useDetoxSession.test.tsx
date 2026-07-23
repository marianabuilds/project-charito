import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDetoxSession } from './useDetoxSession'

function advanceTimersBySeconds(seconds: number) {
  act(() => {
    vi.advanceTimersByTime(seconds * 1000)
  })
}

describe('useDetoxSession', () => {
  const speak = vi.fn()
  const cancel = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    speak.mockReset()
    cancel.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('counts down and completes a session', () => {
    const { result } = renderHook(() =>
      useDetoxSession({
        durationMinutes: 0.1, // 6 seconds after minimum clamp to 60s
        mode: 'gentle',
        cultureId: 'pe',
        phraseText: 'test phrase',
        voiceLang: 'es-PE',
        engine: {
          isSupported: true,
          speak,
          cancel,
        },
      }),
    )

    expect(result.current.status).toBe('idle')

    act(() => {
      result.current.start()
    })

    expect(result.current.status).toBe('running')

    // Fast-forward time enough that the session finishes.
    advanceTimersBySeconds(65)

    expect(result.current.status).toBe('completed')
    // At least one completion reminder should have been spoken.
    expect(speak).toHaveBeenCalled()
  })

  it('emits a mid-session reminder in gentle mode', () => {
    const { result } = renderHook(() =>
      useDetoxSession({
        durationMinutes: 1,
        mode: 'gentle',
        cultureId: 'us',
        phraseText: 'gentle phrase',
        voiceLang: 'en-US',
        engine: {
          isSupported: true,
          speak,
          cancel,
        },
      }),
    )

    act(() => {
      result.current.start()
    })

    // Halfway through a 60-second session.
    advanceTimersBySeconds(31)

    expect(speak).toHaveBeenCalled()
  })

  it('does not schedule speech when engine is not supported', () => {
    const { result } = renderHook(() =>
      useDetoxSession({
        durationMinutes: 0.5,
        mode: 'strict',
        cultureId: 'mx',
        phraseText: 'strict phrase',
        voiceLang: 'es-MX',
        engine: {
          isSupported: false,
          speak,
          cancel,
        },
      }),
    )

    act(() => {
      result.current.start()
    })

    advanceTimersBySeconds(40)

    expect(speak).not.toHaveBeenCalled()
  })
})

