import { Inject, Injectable } from "@nestjs/common";
import { Activite } from "../../../domain/activite/entities/activite.entity";
import type { ActiviteRepository } from "../../../domain/activite/repositories/activite.repository.interface";
import type { DisponibiliteActiviteRepository } from "../../../domain/disponibilite/repositories/disponibilite-activite.repository.interface";
import type { DisponibiliteJourneeRepository } from "../../../domain/disponibilite/repositories/disponibilite-journee.repository.interface";
import {
  ACTIVITE_REPOSITORY,
  DISPONIBILITE_ACTIVITE_REPOSITORY,
  DISPONIBILITE_JOURNEE_REPOSITORY,
  UTILISATEUR_REPOSITORY,
} from "../../../domain/shared/tokens";
import type { UtilisateurRepository } from "../../../domain/utilisateur/repositories/utilisateur.repository.interface";
import {
  ActiviteColonneDto,
  DisponibiliteEffectiveDto,
} from "../dto/disponibilite-effectif.dto";
import { ConsulterEffectifMatchQueryDto } from "../dto/consulter-effectif-match-query.dto";
import {
  EffectifMatchBadgeDto,
  EffectifMatchResponseDto,
  JoueurEffectifMatchDto,
} from "../dto/effectif-match.dto";
import { fusionnerDisponibiliteEffective } from "../services/fusionner-disponibilite-effective";

const REPONSE_AUCUN_MATCH: EffectifMatchResponseDto = {
  matchCourant: null,
  matchPrecedentId: null,
  matchSuivantId: null,
  badge: null,
  matchsAVenir: [],
  joueurs: [],
};

/**
 * Vue "un match à la fois" de l'effectif : navigation précédent/suivant parmi les matchs à
 * venir, badge de synthèse (présents/disponibles/% saisie) pour le match affiché, et par
 * joueur un % global de matchs à venir renseignés + son statut pour le match affiché.
 * Remplace `ConsulterDisponibilitesEffectifUseCase` (grille toutes activités confondues,
 * supprimée) — cf. décision d'architecture journalisée dans `decisions.json` pour
 * `retravaille-laffichage-de-la-page-dispo-effectif-plutt-que-d`.
 */
@Injectable()
export class ConsulterEffectifMatchUseCase {
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
    query: ConsulterEffectifMatchQueryDto,
  ): Promise<EffectifMatchResponseDto> {
    const aujourdHui = new Date().toISOString().slice(0, 10);
    const activitesAVenir =
      await this.activiteRepository.findUpcoming(aujourdHui);
    const matchsAVenir = activitesAVenir.filter(
      (activite): activite is Activite & { date: string } =>
        activite.type === "match" && activite.date !== undefined,
    );

    if (matchsAVenir.length === 0) {
      return REPONSE_AUCUN_MATCH;
    }

    const index = query.matchId
      ? matchsAVenir.findIndex((match) => match.id === query.matchId)
      : -1;
    const indexResolu = index === -1 ? 0 : index;
    const matchCourant = matchsAVenir[indexResolu];

    const utilisateurs = await this.utilisateurRepository.findAll();
    const datesDistinctes = Array.from(
      new Set(matchsAVenir.map((match) => match.date)),
    );
    const matchIds = matchsAVenir.map((match) => match.id);

    const [disponibilitesJournee, disponibilitesActivite] = await Promise.all([
      this.disponibiliteJourneeRepository.findByDates(datesDistinctes),
      this.disponibiliteActiviteRepository.findByActiviteIds(matchIds),
    ]);

    const journeeParCle = indexerParCle(
      disponibilitesJournee,
      (d) => `${d.utilisateurId}|${d.date}`,
    );
    const activiteParCle = indexerParCle(
      disponibilitesActivite,
      (d) => `${d.utilisateurId}|${d.activiteId}`,
    );

    const joueurs: JoueurEffectifMatchDto[] = utilisateurs.map(
      (utilisateur) => {
        let disponibiliteMatchCourant: DisponibiliteEffectiveDto | undefined;
        let renseignes = 0;

        for (const match of matchsAVenir) {
          const disponibilite = fusionnerDisponibiliteEffective(
            activiteParCle.get(`${utilisateur.id}|${match.id}`),
            journeeParCle.get(`${utilisateur.id}|${match.date}`),
          );
          if (disponibilite.source !== "aucune") {
            renseignes += 1;
          }
          if (match.id === matchCourant.id) {
            disponibiliteMatchCourant = disponibilite;
          }
        }

        return {
          utilisateurId: utilisateur.id,
          displayName: utilisateur.displayName,
          pourcentageMatchsAVenirRenseignes: Math.round(
            (renseignes / matchsAVenir.length) * 100,
          ),
          // Toujours défini : `matchCourant` appartient à `matchsAVenir`, la boucle le traverse.
          disponibiliteMatchCourant: disponibiliteMatchCourant!,
        };
      },
    );

    return {
      matchCourant: toActiviteColonneDto(matchCourant),
      matchPrecedentId:
        indexResolu > 0 ? matchsAVenir[indexResolu - 1].id : null,
      matchSuivantId:
        indexResolu < matchsAVenir.length - 1
          ? matchsAVenir[indexResolu + 1].id
          : null,
      badge: construireBadge(joueurs, utilisateurs.length),
      matchsAVenir: matchsAVenir.map(toActiviteColonneDto),
      joueurs,
    };
  }
}

function construireBadge(
  joueurs: JoueurEffectifMatchDto[],
  effectifTotal: number,
): EffectifMatchBadgeDto {
  const nbPresents = joueurs.filter(
    (joueur) => joueur.disponibiliteMatchCourant.statut === "present",
  ).length;
  const nbDisponibles = joueurs.filter(
    (joueur) => joueur.disponibiliteMatchCourant.statut === "disponible",
  ).length;
  const nbRenseignes = joueurs.filter(
    (joueur) => joueur.disponibiliteMatchCourant.source !== "aucune",
  ).length;

  return {
    nbPresents,
    nbDisponibles,
    pourcentageSaisie:
      effectifTotal === 0
        ? 0
        : Math.round((nbRenseignes / effectifTotal) * 100),
  };
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

function toActiviteColonneDto(
  activite: Activite & { date: string },
): ActiviteColonneDto {
  return {
    id: activite.id,
    date: activite.date,
    heureConvocation: activite.heureConvocation,
    heureDebut: activite.heureDebut,
    label: activite.label,
    type: activite.type,
    commentaire: activite.commentaire,
    equipe: activite.equipe,
  };
}
