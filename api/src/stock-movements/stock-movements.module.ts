import { Module } from '@nestjs/common';
import { StockMovementsService } from './stock-movements.service.js';
import { ProductStockController } from './product-stock.controller.js';

@Module({
  providers: [StockMovementsService],
  controllers: [ProductStockController],
})
export class StockMovementsModule {}
