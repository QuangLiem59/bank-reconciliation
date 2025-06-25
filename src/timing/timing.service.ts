import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { RequestPhase } from './timing.interfaces';

@Injectable()
export class TimingService {
  static initializeTiming(req: Request): void {
    if (!req.timing) {
      const requestId = uuidv4();

      req.timing = {
        requestId,
        start: Date.now(),
        steps: [],
        markTiming: function (stepName: string, phase: RequestPhase) {
          const now = Date.now();

          // Complete current step if exists
          if (this.currentStep) {
            const duration = now - this.currentStep.startTime;
            this.steps.push({
              name: this.currentStep.name,
              category: this.currentStep.phase,
              duration,
              startTime: this.currentStep.startTime,
              endTime: now,
            });
          }

          // Start new step
          this.currentStep = {
            phase,
            name: stepName,
            startTime: now,
          };
        },
      };

      // Mark the initial request timing
      req.timing.markTiming('Request received', RequestPhase.INCOMING);
    }
  }

  static extractNetworkTimingFromHeaders(req: Request): void {
    if (!req.timing) return;

    // Look for client-side timing data from headers
    const dnsLookup = req.header('X-DNS-Lookup-Time');
    const tcpHandshake = req.header('X-TCP-Handshake-Time');
    const ttfb = req.header('X-TTFB-Time');
    const contentDownload = req.header('X-Content-Download-Time');

    if (dnsLookup || tcpHandshake || ttfb || contentDownload) {
      req.timing.networkInfo = {
        dnsLookup: dnsLookup ? parseInt(dnsLookup, 10) : undefined,
        tcpHandshake: tcpHandshake ? parseInt(tcpHandshake, 10) : undefined,
        ttfb: ttfb ? parseInt(ttfb, 10) : undefined,
        contentDownload: contentDownload
          ? parseInt(contentDownload, 10)
          : undefined,
      };

      // Calculate total network time if all data is available
      const values = [
        req.timing.networkInfo.dnsLookup || 0,
        req.timing.networkInfo.tcpHandshake || 0,
        req.timing.networkInfo.ttfb || 0,
        req.timing.networkInfo.contentDownload || 0,
      ];

      if (values.some((v) => v > 0)) {
        req.timing.networkInfo.totalNetworkTime = values.reduce(
          (sum, val) => sum + val,
          0,
        );
      }
    }
  }

  static finalizeTiming(req: Request): void {
    if (!req.timing || !req.timing.currentStep) return;

    // Finish the last step
    const now = Date.now();
    const duration = now - req.timing.currentStep.startTime;

    req.timing.steps.push({
      name: req.timing.currentStep.name,
      category: req.timing.currentStep.phase,
      duration,
      startTime: req.timing.currentStep.startTime,
      endTime: now,
    });

    // Clear the current step
    req.timing.currentStep = undefined;
  }
}
