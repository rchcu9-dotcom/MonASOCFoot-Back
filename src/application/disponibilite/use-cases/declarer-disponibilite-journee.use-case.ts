import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { DisponibiliteJournee } from "../../../domain/disponibilite/entities/disponibilite-journee.entity";
import type { DisponibiliteJourneeRepository } from "../../../domain/disponibilite/repositories/disponibilite-journee.repository.interface";
import { DISPONIBILITE_JOURNEE_REPOSITORY } from "../../../domain/shared/tokens";
import type { Utilisateur } from "../../../domain/utilisateur/entities/utilisateur.entity";
import { resoudreUtilisateurCible } from "./declarer-disponibilite-activite.use-case";
import { DeclarerDisponibiliteJourneeDto } from "../dto/declarer-disponibilite-journee.dto";

/**
 * Upsert par clé naturelle `(utilisateurId, date)` — la route HTTP ne porte que `date`, jamais
 * l'id interne de la ligne `DisponibiliteJournee`. Pas de vérification d'existence d'activité
 * pour cette date (décision en autonomie, cf. track §6.e) : la spec présente « au moins une
 * activité ce jour-là » comme le parcours UI normal, pas comme une contrainte serveur.
 */
@Injectable()
export class DeclarerDisponibiliteJourneeUseCase {
  constructor(
    @Inject(DISPONIBILITE_JOURNEE_REPOSITORY)
    private readonly disponibilites: DisponibiliteJourneeRepository,
  ) {}

  async execute(
    date: string,
    dto: DeclarerDisponibiliteJourneeDto,
    utilisateurConnecte: Utilisateur,
  ): Promise<DisponibiliteJournee> {
    const utilisateurCibleId = resoudreUtilisateurCible(
      dto.utilisateurId,
      utilisateurConnecte,
    );

    const existante = await this.disponibilites.findByUtilisateurEtDate(
      utilisateurCibleId,
      date,
    );

    return this.disponibilites.save({
      id: existante?.id ?? randomUUID(),
      utilisateurId: utilisateurCibleId,
      date,
      statut: dto.statut,
      commentaire: dto.commentaire,
    });
  }
}
