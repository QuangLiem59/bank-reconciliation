import { User } from '@entities/user.entity';

export interface TimingStep {
  name: string;
  duration: number;
  category: RequestPhase;
  startTime: number;
  endTime: number;
}

export interface NetworkInfo {
  dnsLookup?: number;
  tcpHandshake?: number;
  ttfb?: number;
  contentDownload?: number;
  totalNetworkTime?: number;
}

export enum RequestPhase {
  INCOMING = 'incoming',
  MIDDLEWARE = 'middleware',
  GUARDS = 'guards',
  INTERCEPTORS_PRE = 'interceptors_pre',
  PIPES = 'pipes',
  CONTROLLER = 'controller',
  SERVICE = 'service',
  INTERCEPTORS_POST = 'interceptors_post',
  EXCEPTION_FILTERS = 'exception_filters',
  RESPONSE = 'response',
}

export interface TimingInfo {
  requestId: string;
  start: number;
  steps: TimingStep[];
  currentStep?: {
    phase: RequestPhase;
    name: string;
    startTime: number;
  };
  markTiming: (stepName: string, phase: RequestPhase) => void;
  networkInfo?: NetworkInfo;
}

declare module 'express' {
  interface Request {
    timing?: TimingInfo;
    user?: {
      data: User & {
        _id: string;
      };
    };
  }
}
