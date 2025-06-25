import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { RequestTimingInterceptor } from './timing.interceptor';
import { TimingMiddleware } from './timing.middleware';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestTimingInterceptor,
    },
  ],
  exports: [],
})
export class RequestTimingModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TimingMiddleware).forRoutes('*');
  }
}
