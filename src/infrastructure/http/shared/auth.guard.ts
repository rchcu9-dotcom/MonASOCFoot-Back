import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import type { AuthServicePort } from "../../../domain/auth/ports/auth-service.port";
import { AUTH_SERVICE } from "../../../domain/shared/tokens";
import { UtilisateurProvisioningService } from "../../auth/utilisateur-provisioning.service";
import { REQUIRE_AUTH_KEY } from "./require-auth.decorator";

/**
 * Variante "authentifié simple" de `AdminGuard` : exige un bearer token valide,
 * auto-provisionne l'utilisateur, mais n'exige aucun rôle particulier.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(AUTH_SERVICE) private readonly authService: AuthServicePort,
    private readonly provisioningService: UtilisateurProvisioningService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requireAuth = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requireAuth) return true;

    const token = this.extractBearer(context);
    if (!token) throw new UnauthorizedException();

    const payload = await this.authService.validateToken(token);
    if (!payload) throw new UnauthorizedException();

    const user = await this.provisioningService.provision(payload);
    if (!user) throw new UnauthorizedException();

    const request = context.switchToHttp().getRequest<Request>();
    (request as Request & { utilisateur?: typeof user }).utilisateur = user;
    return true;
  }

  private extractBearer(context: ExecutionContext): string | null {
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers["authorization"];
    if (!authorization || !authorization.startsWith("Bearer ")) return null;
    const token = authorization.slice(7).trim();
    return token || null;
  }
}
