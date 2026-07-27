import { settingsStore } from '../state/settingsStore';
import { getVoiceActor, resolveDeviceVoice } from '../data/voiceActors';

export function isSupported(): boolean {
  return typeof window !== 'undefined' && Boolean(window.speechSynthesis);
}

function loadVoices(): SpeechSynthesisVoice[] {
  if (!isSupported()) return [];
  return window.speechSynthesis.getVoices();
}

/** Ensure voices are loaded (Chrome loads them async). */
export function ensureVoicesLoaded(): Promise<SpeechSynthesisVoice[]> {
  if (!isSupported()) return Promise.resolve([]);
  const existing = loadVoices();
  if (existing.length > 0) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const done = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', done);
      resolve(loadVoices());
    };
    window.speechSynthesis.addEventListener('voiceschanged', done);
    // Fallback if event never fires
    window.setTimeout(done, 500);
  });
}

export function speak(message: string, languageCode: string): Promise<void> {
  if (!isSupported()) {
    return Promise.resolve();
  }

  return ensureVoicesLoaded().then((voices) => {
    return new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(message);
      const settings = settingsStore.get();
      const actor = getVoiceActor(settings.voiceActorId);
      const deviceVoice = resolveDeviceVoice(actor, voices);

      utterance.lang = deviceVoice?.lang || actor.languageCode || languageCode;
      if (deviceVoice) {
        utterance.voice = deviceVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (event) => {
        console.error('speech synthesis error', event);
        resolve();
      };

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    });
  });
}
