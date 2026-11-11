import { Module } from '@nestjs/common';
import { WarehousesService } from './warehouses.service.js';
import { WarehousesController } from './warehouses.controller.js';

@Module({
  providers: [WarehousesService],
  controllers: [WarehousesController]
})
export class WarehousesModule {}
