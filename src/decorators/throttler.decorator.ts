import { applyDecorators, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { THROTTLE_LIMITS } from 'src/constants/throttler.constants';

export function UseThrottler(limitNames: Array<keyof typeof THROTTLE_LIMITS>) {
  const throttleOptions = {};

  limitNames.forEach((limitName) => {
    const config = THROTTLE_LIMITS[limitName];
    throttleOptions[config.name] = {
      limit: config.limit,
      ttl: config.ttl,
    };
  });

  return applyDecorators(Throttle(throttleOptions), UseGuards(ThrottlerGuard));
}
