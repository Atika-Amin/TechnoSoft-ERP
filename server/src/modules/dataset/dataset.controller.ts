import { Body, Controller, Get, Header, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from '../../common/decorators/public.decorator.js';
import { DatasetService, type UploadedAudio } from './dataset.service.js';
import { SubmitSampleDto } from './dto/submit-sample.dto.js';

// /api/dataset: collects voice recordings for training.
// prompt + samples are public (anyone with the link can record); stats + export need login.
@Controller('dataset')
export class DatasetController {
  constructor(private readonly dataset: DatasetService) {}

  @Public()
  @Get('prompt')
  prompt(@Query('mode') mode?: string) {
    return this.dataset.prompt(mode === 'scenario' ? 'scenario' : 'read');
  }

  @Public()
  @Post('samples')
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 5 * 1024 * 1024 } }))
  submit(@Body() dto: SubmitSampleDto, @UploadedFile() file?: UploadedAudio) {
    return this.dataset.submit(dto, file);
  }

  @Get('stats')
  stats() {
    return this.dataset.stats();
  }

  @Get('export')
  @Header('Content-Type', 'application/x-ndjson; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="voice-samples.jsonl"')
  exportJsonl() {
    return this.dataset.exportJsonl();
  }
}
