import { forwardRef, Global, Module } from '@nestjs/common';
import { UserModule } from 'src/apps/api-gateway/src/modules/user/user.module';

@Global()
@Module({
  imports: [forwardRef(() => UserModule)],
  exports: [UserModule],
})
export class SharedModule {}
