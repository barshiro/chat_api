import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WebSocketsGateway } from './websockets.gateway';
import { WebSocketsService } from './websockets.service';
import { GroupMembersSchema } from '../models/group-members.schema';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'GroupMembers', schema: GroupMembersSchema }]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
  ],
  providers: [WebSocketsGateway, WebSocketsService],
  exports: [WebSocketsService],
})
export class WebSocketsModule {}
