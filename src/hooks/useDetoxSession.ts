import { useEffect, useRef, useState } from 'react'
import type { CultureId, ModeId } from '../data/presets'
import type { SpeechEngine } from '../audio/speechEngine'

export type SessionStatus = 'idle' | 'running' | 'paused' | 'completed'

export interface DetoxSessionConfig {
  durationMinutes: number
  mode: ModeId
  cultureId: CultureId
  phraseText: string
  voiceLang: string
  engine: SpeechEngine
}

export interface DetoxSessionControls {
  status: SessionStatus
  remainingSeconds: number
  totalSeconds: number
  start: () => void
  pause: () => void
  resume: () => void
  reset: () => void
}

export function useDetoxSession(config: DetoxSessionConfig): DetoxSessionControls {
  const { durationMinutes, mode, cultureId, phraseText, voiceLang, engine } =
    config

  const totalSeconds = Math.max(60, Math.round(durationMinutes * 60))

  const [status, setStatus] = useState<SessionStatus>('idle')
  const [remainingSeconds, setRemainingSeconds] = useState<number>(totalSeconds)

  const hasMidReminderRef = useRef(false)
  const hasCompletionSpokenRef = useRef(false)
  const latestConfigRef = useRef({
    mode,
    cultureId,
    phraseText,
    voiceLang,
  })

  useEffect(() => {
    latestConfigRef.current = { mode, cultureId, phraseText, voiceLang }
  }, [mode, cultureId, phraseText, voiceLang])

  // Reset countdown when duration changes while idle or completed.
  useEffect(() => {
    if (status === 'idle' || status === 'completed') {
      setRemainingSeconds(totalSeconds)
      hasMidReminderRef.current = false
      hasCompletionSpokenRef.current = false
    }
  }, [status, totalSeconds])

  useEffect(() => {
    if (status !== 'running') return
    if (typeof window === 'undefined') return

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(intervalId)
          setStatus('completed')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [status])

  // Schedule audio reminders based on elapsed time and mode.
  useEffect(() => {
    if (!engine.isSupported) return
    if (status !== 'running' && status !== 'completed') return

    const { mode: latestMode, phraseText: latestText, voiceLang: latestLang } =
      latestConfigRef.current

    const elapsed = totalSeconds - remainingSeconds

    // Gentle mode: one reminder halfway through, and one at completion.
    if (
      latestMode === 'gentle' &&
      status === 'running' &&
      !hasMidReminderRef.current &&
      elapsed >= totalSeconds / 2
    ) {
      hasMidReminderRef.current = true
      engine.speak(latestText, {
        lang: latestLang,
      })
    }

    // All modes: speak once when the session completes.
    if (status === 'completed' && !hasCompletionSpokenRef.current) {
      hasCompletionSpokenRef.current = true
      engine.speak(latestText, {
        lang: latestLang,
      })
    }
  }, [engine, remainingSeconds, status, totalSeconds])

  function start() {
    engine.cancel()
    setRemainingSeconds(totalSeconds)
    hasMidReminderRef.current = false
    hasCompletionSpokenRef.current = false
    setStatus('running')
  }

  function pause() {
    if (status !== 'running') return
    engine.cancel()
    setStatus('paused')
  }

  function resume() {
    if (status !== 'paused') return
    setStatus('running')
  }

  function reset() {
    engine.cancel()
    setStatus('idle')
    setRemainingSeconds(totalSeconds)
    hasMidReminderRef.current = false
    hasCompletionSpokenRef.current = false
  }

  return {
    status,
    remainingSeconds,
    totalSeconds,
    start,
    pause,
    resume,
    reset,
  }
}

