import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import type { ActiviteRepository } from "../../../domain/activite/repositories/activite.repository.interface";
import { DisponibiliteActivite } from "../../../domain/disponibilite/entities/disponibilite-activite.entity";
import type { DisponibiliteActiviteRepository } from "../../../domain/disponibilite/repositories/disponibilite-activite.repository.interface";
import {
  ACTIVITE_REPOSITORY,
  DISPONIBILITE_ACTIVITE_REPOSITORY,
} from "../../../domain/shared/tokens";
import type { Utilisateur } from "../../../domain/utilisateur/entities/utilisateur.entity";
import { DeclarerDisponibiliteActiviteDto } from "../dto/declarer-disponibilite-activite.dto";

/**
 * Upsert par clé naturelle `(utilisateurId, activiteId)` — la route HTTP ne porte que
 * `activiteId`, jamais l'id interne de la ligne `DisponibiliteActivite`.
 */
@Injectable()
export class DeclarerDisponibiliteActiviteUseCase {
  constructor(
    @Inject(DISPONIBILITE_ACTIVITE_REPOSITORY)
    private readonly disponibilites: DisponibiliteActiviteRepository,
    @Inject(ACTIVITE_REPOSITORY)
    private readonly activites: ActiviteRepository,
  ) {}

  async execute(
    activiteId: string,
    dto: DeclarerDisponibiliteActiviteDto,
    utilisateurConnecte: Utilisateur,
  ): Promise<DisponibiliteActivite> {
    const utilisateurCibleId = resoudreUtilisateurCible(
      dto.utilisateurId,
      utilisateurConnecte,
    );

    const activite = await this.activites.findById(activiteId);
    if (!activite) {
      throw new NotFoundException(`Activité ${activiteId} introuvable`);
    }

    const existante = await this.disponibilites.findByUtilisateurEtActivite(
      utilisateurCibleId,
      activiteId,
    );

    return this.disponibilites.save({
      id: existante?.id ?? randomUUID(),
      utilisateurId: utilisateurCibleId,
      activiteId,
      statut: dto.statut,
      commentaire: dto.commentaire,
    });
  }
}

/**
 * Si `utilisateurIdDemande` est absent, la cible est l'utilisateur connecté. S'il est présent et
 * différent, seul un admin peut agir sur la disponibilité d'un autre utilisateur (cf. spec —
 * critère d'acceptation testant explicitement ce 403).
 */
export function resoudreUtilisateurCible(
  utilisateurIdDemande: string | undefined,
  utilisateurConnecte: Utilisateur,
): string {
  if (
    !utilisateurIdDemande ||
    utilisateurIdDemande === utilisateurConnecte.id
  ) {
    return utilisateurConnecte.id;
  }

  if (utilisateurConnecte.role !== "admin") {
    throw new ForbiddenException(
      "Seul un admin peut modifier la disponibilité d'un autre utilisateur",
    );
  }

  return utilisateurIdDemande;
}
