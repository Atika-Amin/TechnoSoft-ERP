import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

// Persistence for voice_samples
@Injectable()
export class DatasetRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.VoiceSampleCreateInput) {
    return this.prisma.voiceSample.create({ data });
  }

  findAll() {
    return this.prisma.voiceSample.findMany({ orderBy: { id: 'asc' } });
  }

  count() {
    return this.prisma.voiceSample.count();
  }

  countBySpeaker(speakerId: string) {
    return this.prisma.voiceSample.count({ where: { speakerId } });
  }

  speakers() {
    return this.prisma.voiceSample.groupBy({ by: ['speakerId'], _count: { _all: true } });
  }
}
