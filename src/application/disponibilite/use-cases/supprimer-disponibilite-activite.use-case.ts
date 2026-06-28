import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { DisponibiliteActiviteRepository } from "../../../domain/disponibilite/repositories/disponibilite-activite.repository.interface";
import { DISPONIBILITE_ACTIVITE_REPOSITORY } from "../../../domain/shared/tokens";
import type { Utilisateur } from "../../../domain/utilisateur/entities/utilisateur.entity";
import { resoudreUtilisateurCible } from "./declarer-disponibilite-activite.use-case";

/** Supprime la surcharge d'activité : l'utilisateur retombe sur sa disponibilité de journée. */
@Injectable()
export class SupprimerDisponibiliteActiviteUseCase {
  constructor(
    @Inject(DISPONIBILITE_ACTIVITE_REPOSITORY)
    private readonly disponibilites: DisponibiliteActiviteRepository,
  ) {}

  async execute(
    activiteId: string,
    utilisateurIdDemande: string | undefined,
    utilisateurConnecte: Utilisateur,
  ): Promise<void> {
    const utilisateurCibleId = resoudreUtilisateurCible(
      utilisateurIdDemande,
      utilisateurConnecte,
    );

    const existante = await this.disponibilites.findByUtilisateurEtActivite(
      utilisateurCibleId,
      activiteId,
    );
    if (!existante) {
      throw new NotFoundException(
        `Aucune surcharge de disponibilité pour l'activité ${activiteId}`,
      );
    }

    await this.disponibilites.deleteById(existante.id);
  }
}
