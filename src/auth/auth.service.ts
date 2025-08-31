/* eslint-disable prettier/prettier */
import {
    BadRequestException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';
import { ResponseUserDto } from 'src/users/dto/response-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
    constructor(
        private jwtService: JwtService,
        private prisma: PrismaService,
    ) { }

    async generateUserToken(email: string, password?: string) {
        let userResponse: ResponseUserDto;

        const userActive = await this.prisma.user.findFirst({
            where: {
                email, // <-- minúscula
                isActive: true,
                isVerified: true,
            },
        });

        if (!userActive) {
            throw new BadRequestException('Usuario no activo');
        }

        if (password) {
            const isUser = await this.prisma.user.findFirst({ where: { email } });

            if (!isUser) {
                throw new BadRequestException('Usuario incorrecto');
            }

            if (!isUser.isActive || !isUser.isVerified) {
                throw new BadRequestException('El usuario no está activo');
            }

            const passwordMatch = await bcrypt.compare(password, isUser.password);
            if (!passwordMatch) {
                throw new BadRequestException('Usuario o contraseña incorrecta');
            }

            const rolType = await this.prisma.role.findUnique({
                where: { id: isUser.roleId }, // <-- minúscula
            });

            const userDetail = await this.prisma.userDetail.findUnique({
                where: { userId: isUser.id },
            });

            if (!rolType) {
                throw new UnauthorizedException();
            }

            userResponse = {
                id: isUser.id,
                email: isUser.email,
                names: userDetail.names,
                lastNames: userDetail.lastNames,
                phone: userDetail.phone,
                role: [
                    {
                        id: rolType.id,
                        name: rolType.name,
                    },
                ],
            } as ResponseUserDto;
        }

        const payload = {
            id: userResponse.id,
            email: userResponse.email,
            names: userResponse.names,
            lastNames: userResponse.lastNames,
            phone: userResponse.phone,
            rol: userResponse.role,
        };

        return {
            access_token: this.jwtService.sign(payload),
            user: payload,
        };
    }
}
