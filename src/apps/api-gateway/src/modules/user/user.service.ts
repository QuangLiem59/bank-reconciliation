import { Role } from '@entities/role.entity';
import { User } from '@entities/user.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProfilesRepositoryInterface } from '@repositories/profile/profiles.interface';
import { RolesRepositoryInterface } from '@repositories/role/roles.interface';
import * as bcrypt from 'bcrypt';
import { Cache } from 'cache-manager';
import { RoleTransformer } from 'src/apps/api-gateway/src/modules/role/transformers/role.transformer';
import { ROLE_CONSTANTS } from 'src/constants/role.constants';
import { BaseServiceAbstract } from 'src/services/base/base.abstract.service';
import {
  EntityId,
  FindOneResponse,
  IncludeOptions,
} from 'src/types/common.type';

import { UsersRepositoryInterface } from '../../../../../repositories/user/users.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserTransformer } from './transformers/user.transformer';

@Injectable()
export class UserService extends BaseServiceAbstract<User> {
  constructor(
    @Inject('UsersRepositoryInterface')
    private readonly usersRepository: UsersRepositoryInterface,
    @Inject('ProfilesRepositoryInterface')
    private readonly profilesRepository: ProfilesRepositoryInterface,
    @Inject('RolesRepositoryInterface')
    private readonly rolesRepository: RolesRepositoryInterface,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super(usersRepository);
  }

  async createUser(
    createUserDto: CreateUserDto,
    disableTransform?: boolean,
  ): Promise<FindOneResponse<User>> {
    const existed_user = await this.usersRepository.findOneByCondition({
      $or: [
        { email: { $eq: createUserDto.email, $ne: null } },
        { phone: { $eq: createUserDto.phone, $ne: null } },
      ],
    });

    if (existed_user?.data) {
      throw new ConflictException('User already existed!!');
    }

    let username: string;
    let isUnique = false;

    while (!isUnique) {
      username = `user${Math.floor(Math.random() * 10000)}`;
      const existingUser = await this.usersRepository.findOneByCondition({
        username,
      });
      if (!existingUser.data) {
        isUnique = true;
      }
    }

    const user = await this.usersRepository.executeWithTransaction(
      async (session) => {
        const user = await this.usersRepository.create(
          {
            username,
            ...createUserDto,
          },
          session,
        );

        const profile = await this.profilesRepository.create(
          {
            bio: createUserDto.bio,
            gender: createUserDto.gender,
            birthday: createUserDto.birthday,
            avatar_url: createUserDto.avatar_url,
          },
          session,
        );

        user.profile = profile;
        await this.usersRepository.update(
          {
            _id: user._id,
          },
          user,
          null,
          session,
        );

        const defaultRole = await this.rolesRepository.findOneByCondition(
          {
            name: ROLE_CONSTANTS.SUPER_ADMIN,
          },
          [],
          null,
          session,
        );

        if (defaultRole?.data) {
          await this.usersRepository.update(
            {
              _id: user._id,
            },
            {
              roles: [defaultRole.data._id],
            },
            null,
            session,
          );
        }

        return user;
      },
    );

    return this.usersRepository.findOneById(
      user._id,
      ['profile'],
      disableTransform ? null : new UserTransformer(['profile']),
    );
  }

  async findById(
    id: EntityId | string,
    populate?: IncludeOptions | (IncludeOptions | string)[],
  ): Promise<FindOneResponse<User>> {
    const cacheKey = `user-${id}`;
    let user = await this.cacheManager.get<FindOneResponse<User>>(cacheKey);

    if (!user) {
      user = await this.usersRepository.findOneById(
        id,
        populate,
        new UserTransformer(populate),
      );
      if (user) await this.cacheManager.set(cacheKey, user, 1);
      // if (user) await this.cacheManager.set(cacheKey, user, 5 * 60000);
    }
    return user;
  }

  async findByEmail(email: string): Promise<FindOneResponse<User>> {
    return await this.usersRepository.findOneByCondition({ email });
  }

  async getUserPreferredLanguage(userId: string): Promise<string> {
    const cacheKey = `user-${userId}`;
    let user = await this.cacheManager.get<FindOneResponse<User>>(cacheKey);

    if (!user) {
      user = await this.usersRepository.findOneById(userId);
      if (user) await this.cacheManager.set(cacheKey, user, 1);
      // if (user) await this.cacheManager.set(cacheKey, user, 5 * 60000);
    }
    return user?.data?.preferred_language || 'en';
  }

  async updateUser(id: EntityId, updateUserDto: UpdateUserDto): Promise<User> {
    updateUserDto.last_modified_by = id;
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const profileData = {};
    const profileFields = [
      'bio',
      'gender',
      'birthday',
      'avatar_url',
      'address',
      'position',
    ];
    profileFields.forEach((field) => {
      if (updateUserDto[field]) {
        profileData[field] = updateUserDto[field];
      }
    });

    return this.usersRepository.executeWithTransaction(async (session) => {
      const user = await this.usersRepository.update(
        {
          _id: id,
        },
        updateUserDto,
        new UserTransformer([]),
        session,
      );

      if (Object.keys(profileData).length > 0) {
        await this.profilesRepository.update(
          {
            _id: user.profile,
          },
          profileData,
          null,
          session,
        );
      }

      return user;
    });
  }

  async deleteUser(id: EntityId): Promise<void> {
    await this.usersRepository.permanentlyDelete(id);
  }

  async assignRoles(
    id: EntityId | string,
    roleIds: EntityId[],
    reqId?: EntityId,
  ): Promise<User> {
    const user = await this.usersRepository.findOneById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const data = {
      roles: await Promise.all(
        roleIds.map((roleId) =>
          this.rolesRepository
            .findOneById(roleId)
            .then((role) => role.data._id),
        ),
      ),
    };

    if (reqId) {
      data['last_modified_by'] = reqId;
    }

    return this.usersRepository.update(
      {
        _id: id,
      },
      data,
      new UserTransformer([]),
    );
  }

  async getUserRoles(id: EntityId): Promise<EntityId[]> {
    const user = await this.usersRepository.findOneById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.data?.roles.map((role) => role._id);
  }

  async getUserPermissions(
    userId: EntityId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context?: { teamId?: string; companyId?: string },
  ): Promise<string[]> {
    const user = await this.usersRepository.findOneById(userId, [
      'roles.permissions',
      'companies.role_id.permissions',
      'teams.role_id.permissions',
    ]);

    if (!user || !user.data)
      throw new NotFoundException(`User with ID ${userId} not found`);

    const permissions: string[] = [];

    const roles = user.data?.roles as unknown as Role[];
    if (!roles || roles.length === 0) {
      return [];
    }

    roles.forEach((role) => {
      permissions.push(...(role as Role).permissions.map((p: any) => p.name));
    });

    return [...new Set(permissions)];
  }

  async getUserRoleInContext(
    userId: EntityId | string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context?: { teamId?: string; companyId?: string },
  ): Promise<string> {
    const user = await this.usersRepository.findOneById(userId, [
      'roles.name',
      'companies.role_id',
      'teams.role_id',
    ]);

    if (!user || !user.data)
      throw new NotFoundException(`User with ID ${userId} not found`);

    const roles = user.data?.roles as unknown as Role[];
    if (!roles || roles.length === 0) {
      return '';
    }

    return roles[0].name;
  }

  async getUserRole(userId: EntityId | string) {
    const user = await this.usersRepository.findOneById(userId, [
      'roles.name',
      'roles.permissions',
    ]);

    return new RoleTransformer(['permissions']).transform(
      user.data.roles[0] as unknown as Role,
    );
  }
}
