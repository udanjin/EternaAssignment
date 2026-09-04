import { Module } from '@nestjs/common';
import { AuthController } from './auth/auth.controller';
import { ProductsController } from './products/products.controller';
import { ServicesModule } from '../services/services.module';
import { JwtStrategy } from './auth/auth.strategy';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ServicesModule, // Inject all services
  ],
  controllers: [AuthController, ProductsController],
  providers: [JwtStrategy],
})
export class ApiModule {}
