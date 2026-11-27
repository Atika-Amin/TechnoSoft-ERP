import { Module } from '@nestjs/common';
import { DatasetController } from './dataset.controller.js';
import { DatasetRepository } from './dataset.repository.js';
import { DatasetService } from './dataset.service.js';

@Module({
  controllers: [DatasetController],
  providers: [DatasetService, DatasetRepository],
})
export class DatasetModule {}
