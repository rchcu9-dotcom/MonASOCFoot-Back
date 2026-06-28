import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { JwtService } from "@nestjs/jwt";
import type { OAuthProfile } from "@rchcu9-dotcom/auth-passport-back";
import { randomUUID } from "crypto";
import type { Request, Response } from "express";
import { UTILISATEUR_REPOSITORY } from "../../domain/shared/tokens";
import type {
  ProviderUtilisateur,
  Utilisateur,
} from "../../domain/utilisateur/entities/utilisateur.entity";
import type { UtilisateurRepository } from "../../domain/utilisateur/repositories/utilisateur.repository.interface";
import type { AuthTokenPayload } from "../../domain/auth/entities/auth-token-payload.entity";
import { DevLoginDto } from "./dto/dev-login.dto";
import { GoogleConfiguredGuard } from "./google-configured.guard";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(UTILISATEUR_REPOSITORY)
    private readonly utilisateurRepository: UtilisateurRepository,
  ) {}

  @Get("google")
  @UseGuards(GoogleConfiguredGuard, AuthGuard("google"))
  googleLogin(): void {
    // Passport redirige vers Google ; aucun corps de réponse à produire ici.
  }

  @Get("google/callback")
  @UseGuards(GoogleConfiguredGuard, AuthGuard("google"))
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const profile = req.user as OAuthProfile;
    const utilisateur = await this.upsertUtilisateur(
      profile.providerId,
      "google",
      profile.displayName,
      profile.email,
    );
    const token = await this.signToken(utilisateur);
    const frontUrl = process.env.FRONT_URL ?? "http://localhost:5193";
    res.redirect(`${frontUrl}/auth/callback?token=${token}`);
  }

  /**
   * Connexion de secours pour tester l'application en local sans configurer de vrai
   * client OAuth Google. Désactivée par défaut en production (cf. ENABLE_DEV_LOGIN).
   */
  @Post("dev-login")
  async devLogin(@Body() dto: DevLoginDto): Promise<{ token: string }> {
    if (
      process.env.NODE_ENV === "production" &&
      process.env.ENABLE_DEV_LOGIN !== "true"
    ) {
      throw new ForbiddenException("dev-login désactivé en production");
    }
    const providerId = `dev-${dto.email}`;
    const utilisateur = await this.upsertUtilisateur(
      providerId,
      "dev",
      dto.displayName,
      dto.email,
    );
    const token = await this.signToken(utilisateur);
    return { token };
  }

  @Get("me")
  async me(@Req() req: Request): Promise<Utilisateur> {
    const token = this.extractBearer(req);
    if (!token) throw new UnauthorizedException();

    let payload: AuthTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AuthTokenPayload>(token);
    } catch {
      throw new UnauthorizedException();
    }

    const utilisateur = await this.utilisateurRepository.findByProviderId(
      payload.uid,
    );
    if (!utilisateur) throw new UnauthorizedException();
    return utilisateur;
  }

  private async upsertUtilisateur(
    providerId: string,
    provider: ProviderUtilisateur,
    displayName: string,
    email?: string,
  ): Promise<Utilisateur> {
    const now = new Date().toISOString();
    const existing =
      await this.utilisateurRepository.findByProviderId(providerId);
    const bootstrapEmail = process.env.ADMIN_BOOTSTRAP_EMAIL;
    const role =
      existing?.role ??
      (email && bootstrapEmail && email === bootstrapEmail
        ? "admin"
        : "joueur");

    return this.utilisateurRepository.save({
      id: existing?.id ?? randomUUID(),
      providerId,
      provider,
      displayName,
      email,
      role,
      dateApparition: existing?.dateApparition ?? now,
      derniereConnexion: now,
    });
  }

  private async signToken(utilisateur: Utilisateur): Promise<string> {
    const payload: AuthTokenPayload = {
      uid: utilisateur.providerId,
      provider: utilisateur.provider,
      email: utilisateur.email,
      displayName: utilisateur.displayName,
    };
    return this.jwtService.signAsync(payload);
  }

  private extractBearer(req: Request): string | null {
    const authorization = req.headers["authorization"];
    if (!authorization || !authorization.startsWith("Bearer ")) return null;
    const token = authorization.slice(7).trim();
    return token || null;
  }
}
