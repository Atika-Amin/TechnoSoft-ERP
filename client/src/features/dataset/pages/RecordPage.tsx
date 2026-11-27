import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Mic, RotateCcw, SkipForward, Square, Upload } from 'lucide-react';
import { apiErrorMessage } from '../../../lib/axios';
import { getPrompt, submitSample, type RecordMode } from '../api/dataset.api';

// Public page: anyone with the link records voucher sentences for the training dataset.
// Nothing here touches the accounting data.

interface Profile {
  gender: string;
  ageGroup: string;
  region: string;
  environment: string;
  device: string;
}

const MAX_SECONDS = 20;
const REGIONS = ['Dhaka', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna', 'Barishal', 'Rangpur', 'Mymensingh', 'Cumilla / Noakhali', 'Other'];

const loadProfile = (): Profile | null => {
  try {
    return JSON.parse(localStorage.getItem('voiceProfile') ?? 'null');
  } catch {
    return null;
  }
};
const speakerId = (() => {
  let id = localStorage.getItem('voiceSpeakerId');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('voiceSpeakerId', id);
  }
  return id;
})();

const field = 'h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

export default function RecordPage() {
  const [profile, setProfile] = useState<Profile | null>(loadProfile);
  const [editing, setEditing] = useState(!loadProfile());

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#4338ca] text-white">
            <Mic className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">ভয়েস সংগ্রহ</h1>
          <p className="text-sm text-slate-500">Voice collection · Technosoft</p>
        </div>
        {editing || !profile ? (
          <ProfileForm
            initial={profile}
            onDone={(p) => {
              localStorage.setItem('voiceProfile', JSON.stringify(p));
              setProfile(p);
              setEditing(false);
            }}
          />
        ) : (
          <Recorder profile={profile} onEditProfile={() => setEditing(true)} />
        )}
      </div>
    </div>
  );
}

// ── Step 1: who is speaking + consent ──
function ProfileForm({ initial, onDone }: { initial: Profile | null; onDone: (p: Profile) => void }) {
  const [p, setP] = useState<Profile>(
    initial ?? { gender: '', ageGroup: '', region: '', environment: 'quiet', device: /Mobi/i.test(navigator.userAgent) ? 'phone' : 'laptop' },
  );
  const [consent, setConsent] = useState(!!initial);
  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLSelectElement>) => setP({ ...p, [k]: e.target.value });
  const ready = p.gender && p.ageGroup && p.region && consent;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm leading-6 text-slate-700">
        আমরা একটি মডেল বানাচ্ছি যা বাংলায় বলা হিসাবের লেনদেন (ভাউচার) লিখে ফেলতে পারবে। আপনার কণ্ঠ দিয়ে সাহায্য করুন — প্রতিটি রেকর্ডিং মাত্র ৫–১০ সেকেন্ড।
      </p>
      <p className="mt-1 text-xs text-slate-500">
        We're training a model that turns spoken Bangla vouchers into accounting entries. Each recording takes 5–10 seconds.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          লিঙ্গ · Gender
          <select value={p.gender} onChange={set('gender')} className={`${field} mt-1.5`}>
            <option value="">—</option>
            <option value="female">নারী · Female</option>
            <option value="male">পুরুষ · Male</option>
            <option value="other">অন্যান্য · Other</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          বয়স · Age
          <select value={p.ageGroup} onChange={set('ageGroup')} className={`${field} mt-1.5`}>
            <option value="">—</option>
            <option value="under25">২৫ এর কম · Under 25</option>
            <option value="25-40">২৫–৪০</option>
            <option value="40-60">৪০–৬০</option>
            <option value="60plus">৬০+</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          এলাকা / আঞ্চলিক টান · Region
          <select value={p.region} onChange={set('region')} className={`${field} mt-1.5`}>
            <option value="">—</option>
            {REGIONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          কোথায় রেকর্ড করছেন · Where
          <select value={p.environment} onChange={set('environment')} className={`${field} mt-1.5`}>
            <option value="quiet">শান্ত ঘর · Quiet room</option>
            <option value="noisy">শব্দ আছে · Some noise</option>
            <option value="outdoor">বাইরে · Outdoors</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">
          ডিভাইস · Device
          <select value={p.device} onChange={set('device')} className={`${field} mt-1.5`}>
            <option value="phone">ফোন · Phone</option>
            <option value="laptop">ল্যাপটপ · Laptop</option>
            <option value="desktop">ডেস্কটপ · Desktop</option>
          </select>
        </label>
      </div>

      <label className="mt-5 flex gap-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#4338ca]" />
        <span>
          আমি সম্মতি দিচ্ছি যে আমার রেকর্ডিং ও উপরের তথ্য এই মডেল তৈরি ও পরীক্ষার কাজে ব্যবহার করা যাবে। আমার নাম বা ফোন নম্বর নেওয়া হচ্ছে না।
          <span className="mt-1 block text-xs text-slate-500">
            I agree that my recordings and the details above may be used to build and test this model. No name or phone number is collected.
          </span>
        </span>
      </label>

      <button
        disabled={!ready}
        onClick={() => onDone(p)}
        className="mt-5 h-11 w-full rounded-lg bg-[#4338ca] text-sm font-semibold text-white transition hover:bg-[#3730a3] disabled:cursor-not-allowed disabled:opacity-40"
      >
        শুরু করুন · Start
      </button>
    </div>
  );
}

// ── Step 2: record, listen, submit ──
function Recorder({ profile, onEditProfile }: { profile: Profile; onEditProfile: () => void }) {
  const [mode, setMode] = useState<RecordMode>('read');
  const [round, setRound] = useState(0);
  const [count, setCount] = useState(() => Number(localStorage.getItem('voiceCount') ?? 0));
  const [state, setState] = useState<'idle' | 'recording' | 'done'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [audio, setAudio] = useState<{ blob: Blob; url: string; ms: number } | null>(null);
  const [error, setError] = useState('');
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const started = useRef(0);

  const prompt = useQuery({ queryKey: ['voice-prompt', mode, round], queryFn: () => getPrompt(mode), staleTime: Infinity });

  const reset = () => {
    if (audio) URL.revokeObjectURL(audio.url);
    setAudio(null);
    setState('idle');
    setSeconds(0);
    setError('');
  };
  const next = () => {
    reset();
    setRound((r) => r + 1);
  };

  const save = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.append('audio', audio!.blob, 'recording');
      form.append('speakerId', speakerId);
      Object.entries(profile).forEach(([k, v]) => form.append(k, v));
      form.append('mode', mode);
      form.append('seed', String(prompt.data!.seed));
      form.append('durationMs', String(audio!.ms));
      form.append('consent', 'true');
      return submitSample(form);
    },
    onSuccess: (r) => {
      setCount(r.yourCount);
      localStorage.setItem('voiceCount', String(r.yourCount));
      next();
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const start = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false } });
      const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: rec.mimeType });
        setAudio({ blob, url: URL.createObjectURL(blob), ms: Date.now() - started.current });
        setState('done');
      };
      recorder.current = rec;
      started.current = Date.now();
      rec.start();
      setSeconds(0);
      setState('recording');
    } catch {
      setError('মাইক্রোফোন চালু করা যায়নি। ব্রাউজারে মাইকের অনুমতি দিন। · Microphone blocked: allow it in the browser.');
    }
  };
  const stop = () => recorder.current?.state === 'recording' && recorder.current.stop();

  // Timer; stops by itself at MAX_SECONDS
  useEffect(() => {
    if (state !== 'recording') return;
    const t = setInterval(() => {
      const s = Math.floor((Date.now() - started.current) / 1000);
      setSeconds(s);
      if (s >= MAX_SECONDS) stop();
    }, 250);
    return () => clearInterval(t);
  }, [state]);

  const p = prompt.data;
  const tooShort = !!audio && audio.ms < 1000;

  return (
    <>
      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> {count} টি রেকর্ড · {count} recorded
        </span>
        <button onClick={onEditProfile} className="text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline">
          তথ্য বদলান · Edit details
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 rounded-lg border border-slate-200 bg-white p-1 text-sm font-medium">
        {(
          [
            ['read', 'বাক্য পড়ুন', 'Read a sentence'],
            ['scenario', 'নিজের মতো বলুন', 'Your own words'],
          ] as const
        ).map(([key, bn, en]) => (
          <button
            key={key}
            disabled={state === 'recording'}
            onClick={() => {
              reset();
              setMode(key);
            }}
            className={`rounded-md px-3 py-2 transition ${mode === key ? 'bg-[#4338ca] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            {bn} <span className="block text-xs font-normal opacity-75">{en}</span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-medium text-slate-500">
          {mode === 'read'
            ? 'নিচের বাক্যটি স্বাভাবিকভাবে পড়ুন · Read this naturally'
            : 'এই লেনদেনটি নিজের ভাষায় বলুন, যেভাবে অফিসে বলতেন · Say this the way you would at work'}
        </p>

        <div className="mt-3 min-h-[96px]">
          {prompt.isLoading || !p ? (
            <Loader2 className="mx-auto mt-6 h-6 w-6 animate-spin text-slate-400" />
          ) : mode === 'read' ? (
            <p className="text-xl leading-9 text-slate-900">{p.text}</p>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-800">{p.card.typeLabel}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{p.card.dateLabel}</span>
                {p.card.bank && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{p.card.bank}</span>}
              </div>
              {p.card.lines.map((l) => (
                <div key={l.account} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
                  <span className="text-slate-800">{l.account}</span>
                  <span className="text-lg font-semibold tabular-nums text-slate-900">{l.amount}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          {state === 'recording' ? (
            <>
              <button onClick={stop} className="flex h-20 w-20 items-center justify-center rounded-full bg-red-600 text-white shadow-lg ring-8 ring-red-100 transition hover:bg-red-700">
                <Square className="h-7 w-7 fill-current" />
              </button>
              <p className="text-sm font-medium tabular-nums text-red-700">
                রেকর্ড হচ্ছে… 0:{String(seconds).padStart(2, '0')} / 0:{MAX_SECONDS} · tap to stop
              </p>
            </>
          ) : state === 'done' && audio ? (
            <>
              <audio src={audio.url} controls className="w-full" />
              {tooShort && <p className="text-sm text-amber-700">খুব ছোট রেকর্ডিং, আবার চেষ্টা করুন · Too short, please record again</p>}
              <div className="grid w-full grid-cols-2 gap-3">
                <button onClick={reset} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <RotateCcw className="h-4 w-4" /> আবার · Again
                </button>
                <button
                  onClick={() => save.mutate()}
                  disabled={save.isPending || tooShort}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#4338ca] text-sm font-semibold text-white hover:bg-[#3730a3] disabled:opacity-40"
                >
                  {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} জমা দিন · Submit
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={start}
                disabled={!p}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-[#4338ca] text-white shadow-lg ring-8 ring-indigo-100 transition hover:bg-[#3730a3] disabled:opacity-40"
              >
                <Mic className="h-8 w-8" />
              </button>
              <p className="text-sm text-slate-500">ট্যাপ করে বলা শুরু করুন · Tap and speak</p>
            </>
          )}
          {error && <p className="text-center text-sm text-red-700">{error}</p>}
        </div>
      </div>

      <button
        onClick={next}
        disabled={state === 'recording'}
        className="mx-auto mt-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 disabled:opacity-40"
      >
        <SkipForward className="h-4 w-4" /> অন্যটা দিন · Skip this one
      </button>
    </>
  );
}
