import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { Utilisateur } from "../../../domain/utilisateur/entities/utilisateur.entity";
import type { UtilisateurRepository } from "../../../domain/utilisateur/repositories/utilisateur.repository.interface";
import { UTILISATEUR_REPOSITORY } from "../../../domain/shared/tokens";
import { ModifierProfilUtilisateurDto } from "../dto/modifier-profil-utilisateur.dto";

/**
 * Modification du profil personnel (date de naissance, numéro de licence). N'accepte que
 * l'id de l'utilisateur connecté (pas de paramètre `id` de cible) : par construction, aucun
 * appelant ne peut modifier le profil d'un tiers via ce use case.
 */
@Injectable()
export class ModifierProfilUtilisateurUseCase {
  constructor(
    @Inject(UTILISATEUR_REPOSITORY)
    private readonly utilisateurs: UtilisateurRepository,
  ) {}

  async execute(
    idUtilisateurConnecte: string,
    dto: ModifierProfilUtilisateurDto,
  ): Promise<Utilisateur> {
    const aujourdHui = new Date().toISOString().slice(0, 10);
    if (dto.dateNaissance && dto.dateNaissance > aujourdHui) {
      throw new BadRequestException(
        "La date de naissance ne peut pas être dans le futur",
      );
    }

    return this.utilisateurs.updateProfil(idUtilisateurConnecte, {
      dateNaissance: dto.dateNaissance,
      numeroLicence: dto.numeroLicence,
    });
  }
}
