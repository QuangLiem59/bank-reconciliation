import { Module, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
        return {
          pinoHttp: {
            autoLogging: true,
            transport:
              nodeEnv !== 'production'
                ? {
                    target: require.resolve('./pino-pretty-transport'),
                    options: {
                      singleLine: true,
                      colorize: true,
                      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
                    },
                  }
                : undefined,
            level: nodeEnv !== 'production' ? 'debug' : 'info',
            formatters: {
              level: (label) => ({ level: label }),
            },
            serializers: {
              req: (req) => ({
                method: req.method,
                path: req.url,
                headers: req.headers,
                query: req.query,
                params: req.params,
              }),
              res: (res) => ({
                statusCode: res.statusCode,
                responseMsg: res.statusMessage || 'OK',
              }),
              err: (err) => ({
                type: err.constructor.name,
                errMsg: err.message || '',
                stack: err.stack,
                statusCode: err.statusCode || 500,
              }),
            },
            customProps: (req, res: any) => ({
              method: req.method,
              path: req.url,
              statusCode: res.statusCode,
              responseMsg: res.statusMessage || 'OK',
              errMsg: res.locals.errMsg || '',
            }),
            messageKey: 'msg',
            timestamp: () => `,"time":"${new Date().toISOString()}"`,
          },
          exclude: [{ method: RequestMethod.GET, path: '/health' }],
        };
      },
    }),
  ],
})
export class AppLoggerModule {}
