import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, randomInt } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { buildPrompt, type Mode } from './dataset.prompts.js';
import { DatasetRepository } from './dataset.repository.js';
import type { SubmitSampleDto } from './dto/submit-sample.dto.js';

export interface UploadedAudio {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

const EXT: Record<string, string> = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/wav': 'wav' };

@Injectable()
export class DatasetService {
  private readonly dir: string;

  constructor(
    private readonly repo: DatasetRepository,
    config: ConfigService,
  ) {
    this.dir = resolve(config.get('VOICE_DIR', 'uploads/voice'));
  }

  // A new random sentence (read) or situation (scenario)
  prompt(mode: Mode) {
    return buildPrompt(randomInt(0, 2 ** 31 - 1), mode);
  }

  async submit(dto: SubmitSampleDto, file?: UploadedAudio) {
    if (!file) throw new BadRequestException('No recording was sent.');
    const type = file.mimetype.split(';')[0];
    if (!EXT[type]) throw new BadRequestException('Unsupported audio format.');
    if (file.size < 2000) throw new BadRequestException('The recording is empty. Please record again.');

    // Rebuild the prompt from its seed: the label always comes from the server
    const prompt = buildPrompt(dto.seed, dto.mode);

    await mkdir(this.dir, { recursive: true });
    const name = `${Date.now()}-${randomBytes(4).toString('hex')}.${EXT[type]}`;
    await writeFile(join(this.dir, name), file.buffer);

    await this.repo.create({
      speakerId: dto.speakerId,
      gender: dto.gender,
      ageGroup: dto.ageGroup,
      region: dto.region.trim(),
      environment: dto.environment,
      device: dto.device,
      mode: dto.mode,
      seed: dto.seed,
      promptText: prompt.text,
      transcript: dto.mode === 'read' ? prompt.text : '',
      label: JSON.stringify(prompt.label),
      audioFile: name,
      mimeType: type,
      durationMs: dto.durationMs,
      sizeBytes: file.size,
    });
    return { saved: true, yourCount: await this.repo.countBySpeaker(dto.speakerId) };
  }

  async stats() {
    const speakers = await this.repo.speakers();
    return { samples: await this.repo.count(), speakers: speakers.length };
  }

  // One JSON object per line (JSONL), the usual format for training scripts
  async exportJsonl() {
    const rows = await this.repo.findAll();
    return rows.map((r) => JSON.stringify({ ...r, label: JSON.parse(r.label) })).join('\n');
  }
}
