import { useEffect, useRef, useState } from 'react';
import { Video, Upload, Circle, Square, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Primitives';
import { Tabs } from '../ui/Tabs';
import { reelsApi } from '../../api';
import { useUiStore } from '../../store/uiStore';
import type { Game, Reel } from '../../types';

const MAX_RECORD_MS = 60000;

export function CreateReelModal({
  open,
  onClose,
  games,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  games: Game[];
  onCreated: (r: Reel) => void;
}) {
  const pushToast = useUiStore((s) => s.pushToast);
  const [tab, setTab] = useState<'record' | 'upload'>('record');
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [gameId, setGameId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function reset() {
    setBlob(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCaption('');
    setGameId('');
    setRecording(false);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
  }

  useEffect(() => {
    if (!open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
      streamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.play().catch(() => {});
      }
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const recordedBlob = new Blob(chunksRef.current, { type: 'video/webm' });
        setBlob(recordedBlob);
        setPreviewUrl(URL.createObjectURL(recordedBlob));
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      stopTimeoutRef.current = setTimeout(() => stopRecording(), MAX_RECORD_MS);
    } catch {
      pushToast({ title: 'לא ניתן לגשת למצלמה/מיקרופון', variant: 'error' });
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
    if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBlob(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function submit() {
    if (!blob) return;
    setSubmitting(true);
    try {
      const filename = tab === 'record' ? 'reel.webm' : (blob as File).name || 'reel.mp4';
      const { reel } = await reelsApi.create(blob, filename, caption, gameId || undefined);
      onCreated(reel);
      pushToast({ title: 'הרילס פורסם! 🎬', variant: 'success' });
      onClose();
    } catch {
      pushToast({ title: 'העלאת הרילס נכשלה', variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="רילס חדש" wide>
      {!blob && (
        <Tabs
          tabs={[
            { key: 'record', label: 'הקלט', icon: <Video size={15} /> },
            { key: 'upload', label: 'העלה קובץ', icon: <Upload size={15} /> },
          ]}
          active={tab}
          onChange={(k) => {
            reset();
            setTab(k as 'record' | 'upload');
          }}
        />
      )}

      <div className="mt-4">
        {!blob && tab === 'record' && (
          <div className="flex flex-col items-center gap-3">
            <video ref={liveVideoRef} muted className="w-full max-h-80 rounded-xl bg-black object-contain" />
            {!recording ? (
              <Button onClick={startRecording}>
                <Circle size={16} className="fill-current" /> התחל הקלטה
              </Button>
            ) : (
              <Button variant="danger" onClick={stopRecording}>
                <Square size={16} className="fill-current" /> עצור הקלטה
              </Button>
            )}
          </div>
        )}

        {!blob && tab === 'upload' && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Upload size={32} className="text-gray-500" />
            <label className="cursor-pointer">
              <span className="text-hc-accent font-semibold">בחר סרטון מהמכשיר</span>
              <input type="file" accept="video/*" hidden onChange={onPickFile} />
            </label>
          </div>
        )}

        {blob && previewUrl && (
          <div className="space-y-3">
            <video src={previewUrl} controls className="w-full max-h-80 rounded-xl bg-black object-contain" />
            <textarea
              placeholder="כתוב כיתוב לרילס..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={300}
              className="w-full bg-white/5 border border-hc-border rounded-xl px-4 py-2.5 text-sm text-white h-16"
            />
            <select
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              className="w-full bg-white/5 border border-hc-border rounded-xl px-4 py-2.5 text-sm text-white"
            >
              <option value="">ללא משחק ספציפי</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={reset} className="flex-1">
                נסה שוב
              </Button>
              <Button onClick={submit} disabled={submitting} className="flex-1">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : 'פרסם רילס'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
