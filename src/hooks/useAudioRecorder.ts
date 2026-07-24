import { useRef, useState } from 'react';

export interface AudioRecorderState {
  isRecording: boolean;
  recordedBlobUrl: string | null;
  isSupported: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  discardRecording: () => void;
}

/**
 * Hook for browser-based audio recording via MediaRecorder.
 * @param onDataUrl - called with a base64 data URL once the recording is ready.
 *                    Called with '' when the recording is discarded.
 */
export function useAudioRecorder(
  onDataUrl?: (dataUrl: string) => void,
): AudioRecorderState {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const isSupported =
    typeof MediaRecorder !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices);

  const startRecording = async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedBlobUrl(url);

        if (onDataUrl) {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              onDataUrl(reader.result);
            }
          };
          reader.readAsDataURL(blob);
        }
      };

      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = (): void => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  };

  const discardRecording = (): void => {
    if (recordedBlobUrl) URL.revokeObjectURL(recordedBlobUrl);
    setRecordedBlobUrl(null);
    onDataUrl?.('');
  };

  return {
    isRecording,
    recordedBlobUrl,
    isSupported,
    startRecording,
    stopRecording,
    discardRecording,
  };
}
