import { Module } from '@nestjs/common';
import { VouchersController } from './vouchers.controller.js';
import { VouchersRepository } from './vouchers.repository.js';
import { VouchersService } from './vouchers.service.js';

@Module({
  controllers: [VouchersController],
  providers: [VouchersService, VouchersRepository],
})
export class VouchersModule {}
