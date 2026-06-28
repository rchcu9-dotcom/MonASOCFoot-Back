import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { AuthTokenPayload } from "../../domain/auth/entities/auth-token-payload.entity";
import { UTILISATEUR_REPOSITORY } from "../../domain/shared/tokens";
import type {
  ProviderUtilisateur,
  Utilisateur,
} from "../../domain/utilisateur/entities/utilisateur.entity";
import type { UtilisateurRepository } from "../../domain/utilisateur/repositories/utilisateur.repository.interface";

/**
 * Auto-provisioning d'un utilisateur à partir d'un payload de token validé.
 * Mutualisé entre `AdminGuard` et `AuthGuard` (un seul upsert par requête authentifiée).
 */
@Injectable()
export class UtilisateurProvisioningService {
  constructor(
    @Inject(UTILISATEUR_REPOSITORY)
    private readonly utilisateurRepository: UtilisateurRepository,
  ) {}

  async provision(payload: AuthTokenPayload): Promise<Utilisateur | null> {
    const now = new Date().toISOString();
    const existing = await this.utilisateurRepository.findByProviderId(
      payload.uid,
    );

    if (!existing) {
      await this.utilisateurRepository.save({
        id: randomUUID(),
        providerId: payload.uid,
        provider: (payload.provider as ProviderUtilisateur) ?? "google",
        displayName: payload.displayName ?? payload.email ?? payload.uid,
        email: payload.email,
        role: "joueur",
        dateApparition: now,
        derniereConnexion: now,
      });
    } else {
      await this.utilisateurRepository.save({
        ...existing,
        derniereConnexion: now,
      });
    }

    return (
      existing ??
      (await this.utilisateurRepository.findByProviderId(payload.uid))
    );
  }
}
