import { Inject, Injectable } from "@nestjs/common";
import { Activite } from "../../../domain/activite/entities/activite.entity";
import type { ActiviteRepository } from "../../../domain/activite/repositories/activite.repository.interface";
import { DisponibiliteActivite } from "../../../domain/disponibilite/entities/disponibilite-activite.entity";
import { DisponibiliteJournee } from "../../../domain/disponibilite/entities/disponibilite-journee.entity";
import type { DisponibiliteActiviteRepository } from "../../../domain/disponibilite/repositories/disponibilite-activite.repository.interface";
import type { DisponibiliteJourneeRepository } from "../../../domain/disponibilite/repositories/disponibilite-journee.repository.interface";
import {
  ACTIVITE_REPOSITORY,
  DISPONIBILITE_ACTIVITE_REPOSITORY,
  DISPONIBILITE_JOURNEE_REPOSITORY,
  UTILISATEUR_REPOSITORY,
} from "../../../domain/shared/tokens";
import type { UtilisateurRepository } from "../../../domain/utilisateur/repositories/utilisateur.repository.interface";
import { ConsulterDisponibilitesEffectifQueryDto } from "../dto/consulter-disponibilites-effectif-query.dto";
import {
  ActiviteColonneDto,
  DisponibiliteEffectiveDto,
  DisponibilitesEffectifResponseDto,
  LigneJoueurDto,
} from "../dto/disponibilite-effectif.dto";

@Injectable()
export class ConsulterDisponibilitesEffectifUseCase {
  constructor(
    @Inject(ACTIVITE_REPOSITORY)
    private readonly activiteRepository: ActiviteRepository,
    @Inject(UTILISATEUR_REPOSITORY)
    private readonly utilisateurRepository: UtilisateurRepository,
    @Inject(DISPONIBILITE_JOURNEE_REPOSITORY)
    private readonly disponibiliteJourneeRepository: DisponibiliteJourneeRepository,
    @Inject(DISPONIBILITE_ACTIVITE_REPOSITORY)
    private readonly disponibiliteActiviteRepository: DisponibiliteActiviteRepository,
  ) {}

  async execute(
    query: ConsulterDisponibilitesEffectifQueryDto,
  ): Promise<DisponibilitesEffectifResponseDto> {
    const activites = await this.resoudreActivites(query);
    const utilisateurs = await this.utilisateurRepository.findAll();

    const datesDistinctes = Array.from(
      new Set(activites.map((activite) => activite.date)),
    );
    const activiteIds = activites.map((activite) => activite.id);

    const [disponibilitesJournee, disponibilitesActivite] = await Promise.all([
      this.disponibiliteJourneeRepository.findByDates(datesDistinctes),
      this.disponibiliteActiviteRepository.findByActiviteIds(activiteIds),
    ]);

    const journeeParCle = indexerParCle(
      disponibilitesJournee,
      (d) => `${d.utilisateurId}|${d.date}`,
    );
    const activiteParCle = indexerParCle(
      disponibilitesActivite,
      (d) => `${d.utilisateurId}|${d.activiteId}`,
    );

    const joueurs: LigneJoueurDto[] = utilisateurs.map((utilisateur) => {
      const disponibilites: Record<string, DisponibiliteEffectiveDto> = {};

      for (const activite of activites) {
        disponibilites[activite.id] = this.resoudreDisponibiliteEffective(
          utilisateur.id,
          activite,
          activiteParCle,
          journeeParCle,
        );
      }

      return {
        utilisateurId: utilisateur.id,
        displayName: utilisateur.displayName,
        disponibilites,
      };
    });

    return {
      activites: activites.map(toActiviteColonneDto),
      joueurs,
    };
  }

  private async resoudreActivites(
    query: ConsulterDisponibilitesEffectifQueryDto,
  ): Promise<Activite[]> {
    if (query.activiteId) {
      const activite = await this.activiteRepository.findById(query.activiteId);
      return activite ? [activite] : [];
    }

    if (query.date) {
      const activites = await this.activiteRepository.findUpcoming("");
      return activites.filter((activite) => activite.date === query.date);
    }

    const aujourdHui = new Date().toISOString().slice(0, 10);
    return this.activiteRepository.findUpcoming(aujourdHui);
  }

  private resoudreDisponibiliteEffective(
    utilisateurId: string,
    activite: Activite,
    activiteParCle: Map<string, DisponibiliteActivite>,
    journeeParCle: Map<string, DisponibiliteJournee>,
  ): DisponibiliteEffectiveDto {
    const surchargeActivite = activiteParCle.get(
      `${utilisateurId}|${activite.id}`,
    );
    if (surchargeActivite) {
      return {
        statut: surchargeActivite.statut,
        commentaire: surchargeActivite.commentaire,
        source: "activite",
      };
    }

    const disponibiliteJournee = journeeParCle.get(
      `${utilisateurId}|${activite.date}`,
    );
    if (disponibiliteJournee) {
      return {
        statut: disponibiliteJournee.statut,
        commentaire: disponibiliteJournee.commentaire,
        source: "journee",
      };
    }

    return { statut: "autre", source: "aucune" };
  }
}

function indexerParCle<T>(
  elements: T[],
  cle: (element: T) => string,
): Map<string, T> {
  const map = new Map<string, T>();
  for (const element of elements) {
    map.set(cle(element), element);
  }
  return map;
}

function toActiviteColonneDto(activite: Activite): ActiviteColonneDto {
  return {
    id: activite.id,
    date: activite.date,
    heureConvocation: activite.heureConvocation,
    heureDebut: activite.heureDebut,
    label: activite.label,
    type: activite.type,
  };
}
