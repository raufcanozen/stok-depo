import { Module } from '@nestjs/common';
import { SuppliersService } from './suppliers.service.js';
import { SuppliersController } from './suppliers.controller.js';

@Module({
  providers: [SuppliersService],
  controllers: [SuppliersController]
})
export class SuppliersModule {}
