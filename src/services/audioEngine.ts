export function isSupported(): boolean {
  return typeof window !== 'undefined' && Boolean(window.speechSynthesis);
}

export function speak(message: string, languageCode: string): Promise<void> {
  if (!isSupported()) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = languageCode;

    utterance.onend = () => resolve();
    utterance.onerror = (event) => {
      console.error('speech synthesis error', event);
      resolve();
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}
