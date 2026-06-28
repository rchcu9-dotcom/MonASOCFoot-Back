import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { Utilisateur } from "../../../domain/utilisateur/entities/utilisateur.entity";

/**
 * Lit `request.utilisateur`, attaché par `AuthGuard`/`AdminGuard` après validation du token.
 * `undefined` si la route n'est protégée par aucun de ces guards (pas d'auto-provisioning effectué).
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Utilisateur | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { utilisateur?: Utilisateur }>();
    return request.utilisateur;
  },
);
