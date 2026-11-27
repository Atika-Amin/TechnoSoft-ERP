import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { AccountsModule } from './modules/accounts/accounts.module.js';
import { CompanyModule } from './modules/company/company.module.js';
import { DatasetModule } from './modules/dataset/dataset.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { VouchersModule } from './modules/vouchers/vouchers.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // loads .env once, usable everywhere
    PrismaModule,
    UsersModule,
    AuthModule,
    AccountsModule,
    VouchersModule,
    ReportsModule,
    CompanyModule,
    DatasetModule,
  ],
  providers: [
    // Every route requires a valid token unless it is marked @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
