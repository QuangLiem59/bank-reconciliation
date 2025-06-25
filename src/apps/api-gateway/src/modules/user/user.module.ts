import {
  Profile,
  ProfileDocument,
  ProfileSchema,
} from '@entities/profile.entity';
import { UserSeedService } from '@entities/seeders/user.seed';
import { User, UserSchemaFactory } from '@entities/user.entity';
import { Module } from '@nestjs/common';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { ProfilesRepository } from '@repositories/profile/profile.repository';
import { UsersRepository } from '@repositories/user/user.repository';
import { Model } from 'mongoose';
import { RealtimeModule } from 'src/apps/api-gateway/src/modules/realtime/realtime.module';
import { RoleModule } from 'src/apps/api-gateway/src/modules/role/role.module';

import { UserListener } from './listeners/user.listener';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Profile.name,
        useFactory: () => {
          return ProfileSchema;
        },
      },
      {
        name: User.name,
        useFactory: (profileModel: Model<ProfileDocument>) =>
          UserSchemaFactory(profileModel),
        inject: [getModelToken(Profile.name)],
      },
    ]),
    RoleModule,
    RealtimeModule,
  ],
  controllers: [UserController],
  providers: [
    UserListener,
    UserService,
    UserSeedService,
    { provide: 'UsersRepositoryInterface', useClass: UsersRepository },
    { provide: 'ProfilesRepositoryInterface', useClass: ProfilesRepository },
  ],
  exports: [
    UserService,
    MongooseModule,
    { provide: 'UsersRepositoryInterface', useClass: UsersRepository },
  ],
})
export class UserModule {}
