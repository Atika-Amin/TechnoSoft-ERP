import { api } from '../../../lib/axios';

export type RecordMode = 'read' | 'scenario';

export interface VoicePrompt {
  seed: number;
  mode: RecordMode;
  text: string;
  card: { typeLabel: string; dateLabel: string; bank: string | null; lines: { account: string; amount: string }[] };
}

export const getPrompt = (mode: RecordMode) =>
  api.get<VoicePrompt>('/dataset/prompt', { params: { mode } }).then((r) => r.data);

export const submitSample = (form: FormData) =>
  api.post<{ saved: boolean; yourCount: number }>('/dataset/samples', form).then((r) => r.data);
