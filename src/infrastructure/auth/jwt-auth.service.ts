import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { AuthTokenPayload } from "../../domain/auth/entities/auth-token-payload.entity";
import type { AuthServicePort } from "../../domain/auth/ports/auth-service.port";

@Injectable()
export class JwtAuthService implements AuthServicePort {
  constructor(private readonly jwtService: JwtService) {}

  async validateToken(token: string): Promise<AuthTokenPayload | null> {
    if (!token) return null;
    try {
      return await this.jwtService.verifyAsync<AuthTokenPayload>(token);
    } catch {
      return null;
    }
  }
}
