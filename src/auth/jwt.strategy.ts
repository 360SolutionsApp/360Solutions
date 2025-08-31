/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET || 'tu_clave_secreta',
        });
    }

    async validate(payload: any) {
        return {
            id: payload.id,
            email: payload.email,
            names: payload.names,
            lastNames: payload.lastNames,
            phone: payload.phone,
            documentTypes: payload.documentTypes,
            documentNumber: payload.documentNumber,
            Rol: payload.role,
        };
    }
}
