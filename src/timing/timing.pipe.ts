import { mixin, PipeTransform, Type } from '@nestjs/common';

import { RequestPhase } from './timing.interfaces';

export function TimingPipe<T extends PipeTransform>(
  pipe: Type<T>,
  name: string,
): Type<any> {
  class TimedPipeMixin implements PipeTransform {
    async transform(value: any, metadata: any) {
      const req = metadata.data;

      if (req?.timing) {
        req.timing.markTiming(`Pipe: ${name}`, RequestPhase.PIPES);
      }

      const pipeInstance = new pipe();
      const result = await pipeInstance.transform(value, metadata);

      if (req?.timing) {
        req.timing.markTiming(`Pipe: ${name} (completed)`, RequestPhase.PIPES);
      }

      return result;
    }
  }

  return mixin(TimedPipeMixin);
}
