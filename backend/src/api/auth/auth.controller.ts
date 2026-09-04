import { Controller, Post, Body, Res, Get, HttpCode } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from '../../services/auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { access_token } = await this.authService.register(dto);
    this.setTokenCookie(res, access_token);
    return { message: 'Registered successfully' };
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { access_token } = await this.authService.login(dto);
    this.setTokenCookie(res, access_token);
    return { message: 'Logged in successfully' };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  getProfile(@CurrentUser() user: JwtPayload) {
    // Only return safe user info
    return { id: user.sub, email: user.email };
  }

  private setTokenCookie(res: Response, token: string) {
    res.cookie('token', token, {
      httpOnly: true, // Prevents XSS attacks from reading the token
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict', // Prevents CSRF attacks
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
