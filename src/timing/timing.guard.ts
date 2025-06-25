import { mixin, Type } from '@nestjs/common';

import { RequestPhase } from './timing.interfaces';

export function TimingGuard(guard: any, name: string): Type<any> {
  class TimedGuardMixin {
    async canActivate(context: any) {
      const req = context.switchToHttp().getRequest();

      if (req.timing) {
        req.timing.markTiming(`Guard: ${name}`, RequestPhase.GUARDS);
      }

      const guardInstance = new guard();
      const result = await guardInstance.canActivate(context);

      if (req.timing) {
        req.timing.markTiming(
          `Guard: ${name} (completed)`,
          RequestPhase.GUARDS,
        );
      }

      return result;
    }
  }

  return mixin(TimedGuardMixin);
}
