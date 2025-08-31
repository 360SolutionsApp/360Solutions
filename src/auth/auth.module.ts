/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common'; 
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { PrismaService } from 'src/prisma.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
    controllers: [AuthController],
    imports: [
        PassportModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: '24h' },
        }),
        UsersModule,
    ],
    providers: [PrismaService, AuthService, JwtStrategy],
    exports: [AuthService, JwtModule],
})
export class AuthModule { }
