import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({})
export class MongoDbModule {
  static forRootWithUri(uri: string): DynamicModule {
    return {
      module: MongoDbModule,
      imports: [
        MongooseModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: () => ({
            uri: uri,
            onConnectionCreate(connection) {
              connection.on('connected', () => console.log('Mongo connected!'));
              connection.on('open', () => console.log('Mongo open!'));
              connection.on('disconnected', () =>
                console.log('Mongo disconnected!'),
              );
              connection.on('reconnected', () =>
                console.log('Mongo reconnected!'),
              );
              connection.on('disconnecting', () =>
                console.log('Mongo disconnecting!'),
              );

              return connection;
            },
          }),
        }),
      ],
    };
  }
}
