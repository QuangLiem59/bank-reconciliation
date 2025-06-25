import { Session } from '@entities/session.entity';
import { User } from '@entities/user.entity';
import {
  Injectable,
  Req,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ExceptionsHandler } from '@nestjs/core/exceptions/exceptions-handler';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';
import { SessionService } from 'src/apps/api-gateway/src/modules/session/session.service';
import { UserService } from 'src/apps/api-gateway/src/modules/user/user.service';
import { uuidToObjectId } from 'src/helpers/uuidToObjectId';
import { FilterOptions } from 'src/types/common.type';
import { v4 as uuidv4 } from 'uuid';

import { AuthConstants } from './auth.constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly sessionService: SessionService,
    private readonly authConstants: AuthConstants,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userService.findByEmail(email);

    if (
      user.data?.password &&
      (await bcrypt.compare(password, user.data.password))
    ) {
      return user.data;
    }
    throw new UnprocessableEntityException('Invalid credentials');
  }

  async validateRefreshToken(token: string) {
    try {
      await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      const condition: FilterOptions<Session> = {
        refresh_token: token,
        is_revoked: false,
        expires_at: { $gt: new Date() },
      };

      const session = await this.sessionService.findOneByCondition(condition);

      if (!session.data) {
        throw new ExceptionsHandler();
      }

      return this.jwtService.decode(token).sub;
    } catch (error) {
      console.error('Token verification error:', error.message);
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  async login(user: any, @Req() req: Request) {
    const sessionId = uuidToObjectId(uuidv4());
    const payload = { username: user.username, sub: user?._id };
    const access_token = this.jwtService.sign(
      {
        ...payload,
        sessionId,
      },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: this.authConstants.ACCESS_TOKEN_EXPIRY,
      },
    );

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: this.authConstants.REFRESH_TOKEN_EXPIRY,
    });
    const decoded = this.jwtService.decode(access_token) as { exp: number };
    const expiresAt = new Date(decoded.exp * 1000);

    await this.sessionService.create({
      _id: sessionId || uuidToObjectId(uuidv4()),
      user: user,
      device: req.headers['user-agent'] || 'unknown device',
      ip: req.ip,
      access_token,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      is_revoked: false,
    });

    return {
      access_token: access_token,
      refresh_token: refreshToken,
      expired_at: expiresAt,
      session_id: sessionId,
    };
  }

  async validateOAuthLogin(user: any, @Req() req?: Request) {
    if (!user) {
      throw new UnauthorizedException();
    }

    return this.login(user, req);
  }

  async findSocialUser(profile: any) {
    let user = await this.userService.findOneByCondition({
      email: profile.emails[0].value,
    });

    if (!user || !user.data) {
      user = await this.userService.createUser(
        {
          email: profile.emails?.[0]?.value || '',
          username: profile.id,
          name: profile.displayName || '',
          avatar_url: profile.photos?.[0]?.value || '',
          password: process.env.DEFAULT_PASSWORD,
          active: true,
          social_provider: 'google',
          social_id: profile.id,
        },
        true,
      );
    }

    return user.data;
  }

  async refreshToken(token: string, @Req() req: Request) {
    try {
      const userId = await this.validateRefreshToken(token);
      if (!userId) {
        throw new UnauthorizedException('Invalid refresh token' + userId);
      }
      const user = await this.userService.findOne(userId);

      return this.login(user.data, req);
    } catch (error) {
      console.error('Error in refreshToken:', error.message);
      throw error;
    }
  }

  async generateResetToken(email: string): Promise<string> {
    const user = await this.userService.findByEmail(email);
    if (!user || !user.data) return null;
    const userData = user.data;

    const token = this.jwtService.sign(
      { id: userData._id },
      {
        secret: process.env.JWT_RESET_SECRET,
        expiresIn: process.env.JWT_RESET_EXPIRES,
      },
    );

    userData.reset_password_token = token;
    userData.reset_password_expire = new Date(Date.now() + 60 * 60 * 1000);

    await this.userService.update(
      {
        _id: userData._id,
      },
      userData,
    );

    return token;
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    try {
      const decoded = this.jwtService.verify(token, {
        secret: process.env.JWT_RESET_SECRET,
      });

      const user = await this.userService.findOneByCondition({
        _id: decoded.id,
      });
      const userData = user?.data;

      if (
        !userData ||
        userData.reset_password_token !== token ||
        userData.reset_password_expire < new Date()
      ) {
        return false;
      }

      userData.password = await bcrypt.hash(newPassword, 10);
      userData.reset_password_token = undefined;
      userData.reset_password_expire = undefined;

      await this.userService.update(
        {
          _id: userData._id,
        },
        userData,
      );

      return true;
    } catch {
      return false;
    }
  }

  async updatePassword(user: User, oldPassword: string, newPassword: string) {
    const userData = await this.userService.findOne(user.id as any);
    if (!(await bcrypt.compare(oldPassword, userData.data.password))) {
      throw new UnauthorizedException('Invalid password');
    }

    const password = await bcrypt.hash(newPassword, 10);

    return this.userService.update(
      {
        _id: user.id as any,
      },
      {
        password,
      },
    );
  }
}
