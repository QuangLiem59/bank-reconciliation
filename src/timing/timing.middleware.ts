import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

import { RequestPhase } from './timing.interfaces';

@Injectable()
export class TimingMiddleware implements NestMiddleware {
  constructor(private readonly name: string = 'Global') {}

  use(req: Request, res: Response, next: NextFunction) {
    if (req.timing) {
      req.timing.markTiming(
        `Middleware: ${this.name}`,
        RequestPhase.MIDDLEWARE,
      );
    }
    next();
  }
}
