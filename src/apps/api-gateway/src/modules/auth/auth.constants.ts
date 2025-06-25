import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthConstants {
  constructor(private readonly configService: ConfigService) {}

  get ACCESS_TOKEN_EXPIRY() {
    return this.configService.get<string>('JWT_ACCESS_EXPIRATION');
  }

  get REFRESH_TOKEN_EXPIRY() {
    return this.configService.get<string>('JWT_REFRESH_EXPIRATION');
  }

  get JWT_SECRET() {
    return this.configService.get<string>('JWT_SECRET');
  }
}
