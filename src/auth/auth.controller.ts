/* eslint-disable prettier/prettier */
import { Body, Controller, Post, UnauthorizedException } from "@nestjs/common";
import { LoginDto } from "./dto/login.dto";
import { AuthService } from "./auth.service";

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }
    
    @Post('login') 
    async login(@Body() loginDto: LoginDto) {
        try {
            const { email, password } = loginDto;
            
            const result = await this.authService.generateUserToken(email, password);
            
            return {
                success: true,
                message: 'Inicio de sesión exitoso',
                data: {
                    access_token: result.access_token,
                    user: result.user
                }
            };
        } catch (error) {
            throw new UnauthorizedException({
                success: false,
                message: error.message || 'Error al iniciar sesión'
            });
        }
    }
}