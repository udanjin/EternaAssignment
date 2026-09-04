import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ProductsService } from './products.service';
import { PricingService } from './pricing.service';
import { StockService } from './stock.service';
import { InvoicesService } from './invoices.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'secret'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRY', '7d') },
      }),
    }),
  ],
  providers: [AuthService, ProductsService, PricingService, StockService, InvoicesService],
  exports: [AuthService, ProductsService, PricingService, StockService, InvoicesService],
})
export class ServicesModule {}
