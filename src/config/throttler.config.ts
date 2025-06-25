import { ThrottlerModule } from '@nestjs/throttler';
import { THROTTLE_LIMITS } from 'src/constants/throttler.constants';

export const ThrottlerApiModule = ThrottlerModule.forRoot([
  THROTTLE_LIMITS.SHORT,
  THROTTLE_LIMITS.MEDIUM,
  THROTTLE_LIMITS.LONG,
]);
