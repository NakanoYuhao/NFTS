import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('认证')
@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('nonce')
  @ApiOperation({ summary: '获取登录签名 nonce' })
  async getNonce(@Body('address') address: string) {
    const nonce = await this.authService.getNonce(address);
    return { nonce, message: `I confirm login to NFC Trendy Guard.\nNonce: ${nonce}` };
  }

  @Post('login')
  @ApiOperation({ summary: '钱包签名登录' })
  async login(
    @Body('address') address: string,
    @Body('message') message: string,
    @Body('signature') signature: string,
  ) {
    return this.authService.login(address, message, signature);
  }
}
