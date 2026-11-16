import { Module } from '@nestjs/common';
import { ProductStockController } from './product-stock.controller.js';
import { StockMovementsController } from './stock-movements.controller.js';
import { StockMovementsService } from './stock-movements.service.js';

@Module({
  providers: [StockMovementsService],
  controllers: [StockMovementsController, ProductStockController],
})
export class StockMovementsModule {}
