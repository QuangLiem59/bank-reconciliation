import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';

import { RequestPhase } from './timing.interfaces';

interface PhaseStats {
  steps: Array<{ name: string; duration: number }>;
  duration: number;
  percentage?: string;
}

interface TimingBreakdown {
  requestId: string;
  total: {
    duration: number;
    percentage: number;
  };
  phases: Record<RequestPhase, PhaseStats>;
  network?: {
    dnsLookup: number;
    tcpHandshake: number;
    ttfb: number;
    contentDownload: number;
    totalNetworkTime: number;
  };
  client?: {
    estimatedTotal: number;
  };
  discrepancy?: {
    explanation: string;
  };
}

@Injectable()
export class DetailedTimingService {
  static extractNetworkTiming(req: Request) {
    if (!req.timing?.networkInfo) return null;

    return {
      dnsLookup: req.timing.networkInfo.dnsLookup || 0,
      tcpHandshake: req.timing.networkInfo.tcpHandshake || 0,
      ttfb: req.timing.networkInfo.ttfb || 0,
      contentDownload: req.timing.networkInfo.contentDownload || 0,
      totalNetworkTime: req.timing.networkInfo.totalNetworkTime || 0,
    };
  }

  static explainDiscrepancy(
    serverTime: number,
    ttfb: number,
    clientTotal: number,
  ): string {
    if (ttfb > serverTime + 500) {
      return `There is a significant discrepancy between server processing time (${serverTime}ms) and TTFB (${ttfb}ms). 
      This indicates network latency, proxy processing time, or load balancer delays between your server and client.`;
    } else if (clientTotal > serverTime * 1.5) {
      return `The total client-side time (${clientTotal}ms) is considerably higher than server processing time (${serverTime}ms).
      This suggests network conditions or intermediary services are adding overhead.`;
    }

    return `Server processing time: ${serverTime}ms, Client TTFB: ${ttfb}ms. 
    The difference represents network latency and any middleware processing between server and client.`;
  }

  static getDetailedBreakdown(req: Request): TimingBreakdown | null {
    const timingData = req.timing;
    if (!timingData) return null;

    // Calculate server-side total
    const serverTotal = Date.now() - timingData.start;

    // Extract network timing data if available
    const networkTiming = this.extractNetworkTiming(req);

    // Initialize breakdown object with all phases
    const breakdown: TimingBreakdown = {
      requestId: timingData.requestId,
      total: {
        duration: serverTotal,
        percentage: 100,
      },
      phases: {
        [RequestPhase.INCOMING]: { steps: [], duration: 0 },
        [RequestPhase.MIDDLEWARE]: { steps: [], duration: 0 },
        [RequestPhase.GUARDS]: { steps: [], duration: 0 },
        [RequestPhase.INTERCEPTORS_PRE]: { steps: [], duration: 0 },
        [RequestPhase.PIPES]: { steps: [], duration: 0 },
        [RequestPhase.CONTROLLER]: { steps: [], duration: 0 },
        [RequestPhase.SERVICE]: { steps: [], duration: 0 },
        [RequestPhase.INTERCEPTORS_POST]: { steps: [], duration: 0 },
        [RequestPhase.EXCEPTION_FILTERS]: { steps: [], duration: 0 },
        [RequestPhase.RESPONSE]: { steps: [], duration: 0 },
      },
    };

    // Process each step and categorize by phase
    timingData.steps.forEach((step) => {
      const category = step.category;
      const phaseData = breakdown.phases[category];

      if (phaseData) {
        phaseData.steps.push({
          name: step.name,
          duration: step.duration,
        });
        phaseData.duration += step.duration;
      }
    });

    // Calculate percentages for each phase
    Object.keys(breakdown.phases).forEach((phase) => {
      const phaseDuration = breakdown.phases[phase as RequestPhase].duration;
      breakdown.phases[phase as RequestPhase].percentage = (
        (phaseDuration / breakdown.total.duration) *
        100
      ).toFixed(2);
    });

    // Add network timing if available
    if (networkTiming && networkTiming.ttfb > 0) {
      breakdown.network = networkTiming;

      // Calculate estimated client-side total
      breakdown.client = {
        estimatedTotal:
          networkTiming.dnsLookup +
          networkTiming.tcpHandshake +
          networkTiming.ttfb +
          networkTiming.contentDownload,
      };

      // Add discrepancy explanation
      breakdown.discrepancy = {
        explanation: this.explainDiscrepancy(
          breakdown.total.duration,
          networkTiming.ttfb,
          breakdown.client.estimatedTotal,
        ),
      };
    }

    return breakdown;
  }

  static logDetailedBreakdown(req: Request): void {
    const breakdown = this.getDetailedBreakdown(req);
    if (!breakdown) return;

    console.log(
      `\n==== DETAILED API TIMING BREAKDOWN [${breakdown.requestId}] ====`,
    );
    console.log(`Total server processing time: ${breakdown.total.duration}ms`);
    console.log('\nServer Phase breakdown:');

    // Log each phase that has timing data
    Object.entries(breakdown.phases).forEach(([phaseName, phase]) => {
      if (phase.duration > 0) {
        console.log(
          `- ${phaseName}: ${phase.duration}ms (${phase.percentage}%)`,
        );

        if (phase.steps.length > 0) {
          phase.steps.forEach((step) => {
            console.log(`  ├─ ${step.name}: ${step.duration}ms`);
          });
        }
      }
    });

    // Log network timing if available
    if (breakdown.network && breakdown.network.ttfb > 0) {
      console.log('\n==== NETWORK TIMING INFORMATION ====');
      console.log(`DNS Lookup: ${breakdown.network.dnsLookup}ms`);
      console.log(`TCP Handshake: ${breakdown.network.tcpHandshake}ms`);
      console.log(`Waiting (TTFB): ${breakdown.network.ttfb}ms <-- Key metric`);
      console.log(`Content Download: ${breakdown.network.contentDownload}ms`);
      console.log(
        `Total Client-side Time: ${breakdown.client?.estimatedTotal}ms`,
      );

      console.log('\n==== TIMING DISCREPANCY EXPLANATION ====');
      console.log(breakdown.discrepancy?.explanation);
    }
  }

  static addTimingHeaders(req: Request, res: Response): void {
    const breakdown = this.getDetailedBreakdown(req);
    if (!breakdown) return;

    // Add general timing headers
    res.header('X-Request-ID', breakdown.requestId);
    res.header('X-Server-Processing-Time', `${breakdown.total.duration}ms`);

    // Add phase-specific timing headers for significant phases
    Object.entries(breakdown.phases).forEach(([phaseName, phase]) => {
      if (phase.duration > 0) {
        res.header(`X-Timing-${phaseName}`, `${phase.duration}ms`);
      }
    });

    // Add network timing headers if available
    if (breakdown.network && breakdown.network.ttfb > 0) {
      res.header('X-Network-TTFB', `${breakdown.network.ttfb}ms`);
      res.header(
        'X-Total-Estimated-Time',
        `${breakdown.client?.estimatedTotal}ms`,
      );
    }
  }
}

// Example client-side timing script
/*
// Add this to your client-side code to track and send timing metrics
function sendTimingMetrics() {
  const performance = window.performance;
  if (!performance || !performance.timing) return;
  
  const timing = performance.timing;
  
  // Calculate key metrics
  const dnsLookup = timing.domainLookupEnd - timing.domainLookupStart;
  const tcpHandshake = timing.connectEnd - timing.connectStart;
  const ttfb = timing.responseStart - timing.requestStart;
  const contentDownload = timing.responseEnd - timing.responseStart;
  
  // Add timing data to subsequent requests
  const headers = {
    'X-DNS-Lookup-Time': dnsLookup.toString(),
    'X-TCP-Handshake-Time': tcpHandshake.toString(),
    'X-TTFB-Time': ttfb.toString(),
    'X-Content-Download-Time': contentDownload.toString()
  };
  
  // You would use these headers in your fetch/XHR requests
  console.log('Performance metrics to include in next request:', headers);
  
  // Example of adding to fetch request
  fetch('/api/endpoint', {
    headers: headers
  });
}

// Call this after page load completes
window.addEventListener('load', () => {
  // Wait for all metrics to be available
  setTimeout(sendTimingMetrics, 0);
});
*/
