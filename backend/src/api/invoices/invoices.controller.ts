import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
} from '@nestjs/common';
import { InvoicesService } from '../../services/invoices.service';
import { CreateInvoiceDto, InvoiceQueryDto } from './dto/invoice.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.invoicesService.create(user.sub, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: InvoiceQueryDto,
  ) {
    return this.invoicesService.findAll(
      user.sub,
      query.page,
      query.limit,
      query.status,
    );
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.invoicesService.findOne(user.sub, id);
  }

  @Post(':id/issue')
  @HttpCode(200)
  issue(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.invoicesService.issue(user.sub, id);
  }

  @Post(':id/pay')
  @HttpCode(200)
  pay(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.invoicesService.pay(user.sub, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.invoicesService.cancel(user.sub, id);
  }
}
