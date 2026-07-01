import { Inject, Injectable } from "@nestjs/common";
import { DisponibiliteJournee } from "../../../domain/disponibilite/entities/disponibilite-journee.entity";
import type { DisponibiliteJourneeRepository } from "../../../domain/disponibilite/repositories/disponibilite-journee.repository.interface";
import { DISPONIBILITE_JOURNEE_REPOSITORY } from "../../../domain/shared/tokens";
import type { Utilisateur } from "../../../domain/utilisateur/entities/utilisateur.entity";

/**
 * Retourne les disponibilités de journée de l'utilisateur connecté. Pas de mécanisme
 * d'autorisation à appliquer ici : la route ne porte aucun identifiant cible, la cible est
 * toujours l'utilisateur connecté lui-même.
 */
@Injectable()
export class ListerMesDisponibilitesJourneeUseCase {
  constructor(
    @Inject(DISPONIBILITE_JOURNEE_REPOSITORY)
    private readonly disponibilites: DisponibiliteJourneeRepository,
  ) {}

  async execute(
    utilisateurConnecte: Utilisateur,
  ): Promise<DisponibiliteJournee[]> {
    return this.disponibilites.findByUtilisateurId(utilisateurConnecte.id);
  }
}
