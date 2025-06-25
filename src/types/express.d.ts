import { User } from '@entities/user.entity';

declare global {
  namespace Express {
    export interface Request {
      user?: {
        data: User & {
          _id: string;
        };
      };
    }
  }
}
