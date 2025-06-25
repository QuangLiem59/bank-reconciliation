import { User } from '@entities/user.entity';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { SessionService } from 'src/apps/api-gateway/src/modules/session/session.service';
import { CreateUserDto } from 'src/apps/api-gateway/src/modules/user/dto/create-user.dto';
import { UserService } from 'src/apps/api-gateway/src/modules/user/user.service';
import { THROTTLE_LIMITS } from 'src/constants/throttler.constants';
import { UseThrottler } from 'src/decorators/throttler.decorator';
import { FindOneResponse, IncludeOptions } from 'src/types/common.type';

import { MailService } from '../mail/mail.service';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly mailService: MailService,
  ) {}

  /* Register a new user */
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Register a new user with the provided email and password',
  })
  @ApiBody({
    type: CreateUserDto,
    examples: {
      user_1: {
        value: {
          name: 'John',
          email: 'johndoe@example.com',
          phone: '123456789',
          password: 'Asd@123',
          bio: 'I am a chef',
        } as CreateUserDto,
      },
      user_2: {
        value: {
          name: 'Michael',
          email: 'michaelsmith@example.com',
          phone: '987654321',
          password: 'Asd@123',
          bio: 'I am a pilot',
        } as CreateUserDto,
      },
    },
  })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.userService.createUser(createUserDto);
  }

  /* User login */
  @ApiOperation({
    summary: 'User login',
    description: 'Login with the provided email and password',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          example: 'johndoe@example.com',
        },
        password: {
          type: 'string',
          example: 'Asd@123',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'User logged in successfully' })
  @Post('login')
  async login(
    @Body() { email, password }: { email: string; password: string },
    @Req() req: Request,
  ) {
    const user = await this.authService.validateUser(email, password);

    if (user) {
      return await this.authService.login(user, req);
    }
    return { message: 'Invalid credentials' };
  }

  /* User logout */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'User logout',
    description: 'Logout the currently logged in user',
  })
  @ApiResponse({ status: 200, description: 'User logged out successfully' })
  @Post('logout')
  async logout(@Req() req: Request) {
    const userId = req.user.data.id;
    await this.sessionService.revokeSessions(userId);
    return { message: 'Logged out successfully' };
  }

  /* Refresh token */
  @ApiOperation({
    summary: 'Refresh token',
    description: 'Refresh the JWT token',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          example: 'eyJhbGciOi...',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @Post('refresh-token')
  async refreshToken(
    @Body() { token }: { token: string },
    @Req() req: Request,
  ) {
    return await this.authService.refreshToken(token, req);
  }

  /* Get user profile */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Retrieve the profile of the currently logged in user',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    example: {
      data: {
        data: {
          id: '67af0bed42e0d751c88f02d0',
          name: 'Lie2322132mưư',
          username: 'Liem2212ưư233212',
          email: 'liemh23@gmail.com',
          phone: '***-***-9427',
          active: true,
          last_active: '2025-02-14T09:25:01.313Z',
          roles: [],
          profile: {
            id: '67af0bed42e0d751c88f02d3',
            avatar_url:
              'https://res.cloudinary.com/dhelpyr7u/image/upload/v1735695316/public/avatar/1c9e1ba6-7dae-4de1-baa5-acac81f2c91a_wofmhz.jpg',
            gender: 'unspecified',
            created_at: '2025-02-14T09:25:01.511Z',
            updated_at: '2025-02-14T09:25:01.511Z',
          },
          created_at: '2025-02-14T09:25:01.314Z',
          updated_at: '2025-02-14T09:25:01.658Z',
        },
        meta: {
          include: ['roles', 'profile'],
        },
      },
    },
  })
  @Get('profile')
  async profile(
    @Req() req: Request,
    @Query('include') include?: string,
  ): Promise<FindOneResponse<User>> {
    const userId = req.user.data.id;
    let populate: IncludeOptions | (IncludeOptions | string)[] = [];
    if (include) {
      populate = include.split(',');
    }

    return this.userService.findById(userId, populate);
  }

  /* Forgot password */
  @UseThrottler([THROTTLE_LIMITS.STRICT.name])
  @ApiOperation({
    summary: 'Forgot password',
    description: 'Generate a reset token for the provided email',
  })
  @ApiBody({
    type: ForgotPasswordDto,
    examples: {
      forgot_1: {
        value: {
          email: 'abc@gmail.com',
        } as ForgotPasswordDto,
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'If the email exists, a password reset link has been sent',
  })
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.userService.findByEmail(forgotPasswordDto.email);
    if (!user || !user.data) {
      throw new BadRequestException('User with this email does not exist');
    }
    const token = await this.authService.generateResetToken(
      forgotPasswordDto.email,
    );

    if (token) {
      const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

      this.mailService.sendPasswordReset(forgotPasswordDto.email, resetUrl);
    }

    return {
      message: 'If the email exists, a password reset link has been sent',
    };
  }

  /* Reset password */
  @ApiOperation({
    summary: 'Reset password',
    description: 'Reset the password with the provided token',
  })
  @ApiBody({
    type: ResetPasswordDto,
    examples: {
      reset_1: {
        value: {
          token:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3YWYwYmVkNDJlMGQ3NTFjODhmMDJkMCIsImlhdCI6MTY0NzU5MjQ4MiwiZXhwIjoxNjQ3NTk2MDgyfQ.1J1iVv9c8e1eQr5Jq7sYQ2b2QYQJ3F6yL8Z8zJZ1JpA',
          password: 'Asd@123',
        } as ResetPasswordDto,
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const success = await this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.password,
    );

    if (!success) {
      throw new BadRequestException('Invalid or expired token');
    }

    return { message: 'Password reset successfully' };
  }

  /* Update password */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Update password',
    description: 'Update the password of the currently logged in user',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        currentPassword: {
          type: 'string',
          example: 'Asd@123',
        },
        newPassword: {
          type: 'string',
          example: 'Qwe@123',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  @Post('update-password')
  async updatePassword(
    @Body()
    {
      currentPassword,
      newPassword,
    }: { currentPassword: string; newPassword: string },
    @Req() req: Request,
  ) {
    const user = req.user.data;
    return this.authService.updatePassword(user, currentPassword, newPassword);
  }

  /* Google OAuth */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Redirects to Google's authentication page
  }

  /* Google OAuth callback */
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const authResult = await this.authService.validateOAuthLogin(req.user, req);

    const redirectOrigin = '*';
    // const redirectOrigin = process.env.CLIENT_URL;
    res.setHeader('Content-Type', 'text/html');

    return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Complete</title>
          <script>
            // The auth data is directly embedded in the page
            const authData = ${JSON.stringify(authResult)};
            
            // Send message to the parent window with the data
            if (window.opener) {
              window.opener.postMessage({ auth: authData }, "${redirectOrigin}");
              // Close popup after sending the message
              setTimeout(() => window.close(), 500);
            } else {
              // Fallback redirect
              window.location.href = "${redirectOrigin}";
            }
          </script>
        </head>
        <body>
          <p>Authentication successful! Closing window...</p>
        </body>
        </html>
      `);
  }
}
