import { ArgumentsHost, mixin, Type } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

import { RequestPhase } from './timing.interfaces';

export function TimingExceptionFilter(filter: any, name: string): Type<any> {
  class TimedExceptionFilterMixin extends BaseExceptionFilter {
    catch(exception: any, host: ArgumentsHost) {
      const ctx = host.switchToHttp();
      const req = ctx.getRequest();

      if (req?.timing) {
        req.timing.markTiming(
          `ExceptionFilter: ${name}`,
          RequestPhase.EXCEPTION_FILTERS,
        );
      }

      const filterInstance = new filter();
      const result = filterInstance.catch(exception, host);

      if (req?.timing) {
        req.timing.markTiming(
          `ExceptionFilter: ${name} (completed)`,
          RequestPhase.EXCEPTION_FILTERS,
        );
      }

      return result;
    }
  }

  return mixin(TimedExceptionFilterMixin);
}
