import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';

import { DetailedTimingService } from './detailed-timing.service';
import { RequestPhase } from './timing.interfaces';
import { TimingService } from './timing.service';

@Injectable()
export class RequestTimingInterceptor implements NestInterceptor {
  constructor(private readonly scopeName: string = 'Global') {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const isGlobal = this.scopeName === 'Global';

    // Initialize timing if this is the global interceptor
    if (isGlobal) {
      TimingService.initializeTiming(req);
      TimingService.extractNetworkTimingFromHeaders(req);
    }

    // Mark pre-controller interceptor
    req.timing?.markTiming(
      `Interceptor: ${this.scopeName} (pre)`,
      RequestPhase.INTERCEPTORS_PRE,
    );

    return next.handle().pipe(
      tap(() => {
        // Mark post-controller interceptor
        req.timing?.markTiming(
          `Interceptor: ${this.scopeName} (post)`,
          RequestPhase.INTERCEPTORS_POST,
        );
      }),
      finalize(() => {
        // If this is the global interceptor, finalize and log
        if (isGlobal) {
          // Mark response phase
          req.timing?.markTiming('Response preparation', RequestPhase.RESPONSE);

          // Finalize timing
          TimingService.finalizeTiming(req);

          // Process and log results
          DetailedTimingService.logDetailedBreakdown(req);
          DetailedTimingService.addTimingHeaders(req, res);
        }
      }),
    );
  }
}

@Injectable()
export class TimingControllerInterceptor implements NestInterceptor {
  constructor(private readonly controllerName: string) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();

    if (req?.timing) {
      req.timing.markTiming(
        `Controller: ${this.controllerName}`,
        RequestPhase.CONTROLLER,
      );
    }

    return next.handle().pipe(
      tap(() => {
        if (req?.timing) {
          req.timing.markTiming(
            `Controller: ${this.controllerName} (completed)`,
            RequestPhase.CONTROLLER,
          );
        }
      }),
    );
  }
}
