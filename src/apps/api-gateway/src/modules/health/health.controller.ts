import { Controller, Get, HttpCode } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as os from 'os';

@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly mongoConnection: Connection,
  ) {}

  @Get()
  @HttpCode(200)
  async check() {
    // Check system info
    const systemInfo = {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      freeMemory: os.freemem(),
      totalMemory: os.totalmem(),
      cpuUsage: os.loadavg(),
    };

    // Check database connection
    let dbStatus;
    try {
      dbStatus = {
        status: 'up',
        connected: this.mongoConnection.readyState === 1,
      };
    } catch (error) {
      dbStatus = {
        status: 'down',
        error: error.message,
      };
    }

    // Return overall health status
    return {
      status: 'up',
      timestamp: new Date().toISOString(),
      system: systemInfo,
      database: dbStatus,
    };
  }
}
