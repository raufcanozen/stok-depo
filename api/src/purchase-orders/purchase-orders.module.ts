import { Module } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service.js';
import { PurchaseOrdersController } from './purchase-orders.controller.js';

@Module({
  providers: [PurchaseOrdersService],
  controllers: [PurchaseOrdersController]
})
export class PurchaseOrdersModule {}
