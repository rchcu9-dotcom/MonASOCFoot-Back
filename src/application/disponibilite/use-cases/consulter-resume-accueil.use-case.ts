import { Inject, Injectable } from "@nestjs/common";
import { Activite } from "../../../domain/activite/entities/activite.entity";
import type { ActiviteRepository } from "../../../domain/activite/repositories/activite.repository.interface";
import type { DisponibiliteActiviteRepository } from "../../../domain/disponibilite/repositories/disponibilite-activite.repository.interface";
import type { DisponibiliteJourneeRepository } from "../../../domain/disponibilite/repositories/disponibilite-journee.repository.interface";
import {
  ACTIVITE_REPOSITORY,
  DISPONIBILITE_ACTIVITE_REPOSITORY,
  DISPONIBILITE_JOURNEE_REPOSITORY,
} from "../../../domain/shared/tokens";
import type { Utilisateur } from "../../../domain/utilisateur/entities/utilisateur.entity";
import { ActiviteColonneDto } from "../dto/disponibilite-effectif.dto";
import {
  ActiviteAvecDisponibiliteDto,
  ResumeAccueilDto,
} from "../dto/resume-accueil.dto";
import { fusionnerDisponibiliteEffective } from "../services/fusionner-disponibilite-effective";

const NOMBRE_PROCHAINES_DATES = 3;

/**
 * Résumé personnel de la page Accueil pour l'utilisateur connecté : dernière activité passée,
 * 3 prochaines dates d'activités à venir, et tableau de bord (sur les activités à venir
 * uniquement, cf. décisions journalisées dans `decisions.json` pour
 * `sur-la-page-accueil-...`). Endpoint dédié et borné à l'utilisateur connecté — par
 * opposition à `ConsulterDisponibilitesEffectifUseCase` qui charge tout l'effectif.
 */
@Injectable()
export class ConsulterResumeAccueilUseCase {
  constructor(
    @Inject(ACTIVITE_REPOSITORY)
    private readonly activiteRepository: ActiviteRepository,
    @Inject(DISPONIBILITE_JOURNEE_REPOSITORY)
    private readonly disponibiliteJourneeRepository: DisponibiliteJourneeRepository,
    @Inject(DISPONIBILITE_ACTIVITE_REPOSITORY)
    private readonly disponibiliteActiviteRepository: DisponibiliteActiviteRepository,
  ) {}

  async execute(utilisateurConnecte: Utilisateur): Promise<ResumeAccueilDto> {
    const aujourdHui = new Date().toISOString().slice(0, 10);

    const [dernierePasseeBrute, activitesAVenirBrutes] = await Promise.all([
      this.activiteRepository.findDernierePassee(aujourdHui),
      this.activiteRepository.findUpcoming(aujourdHui),
    ]);

    const dernierePasseeActivite = avecDate(dernierePasseeBrute);
    const activitesAVenir = activitesAVenirBrutes.filter(avecDateGuard);

    const activitesPertinentes = dernierePasseeActivite
      ? [dernierePasseeActivite, ...activitesAVenir]
      : activitesAVenir;

    const datesDistinctes = Array.from(
      new Set(activitesPertinentes.map((activite) => activite.date)),
    );
    const activiteIds = activitesPertinentes.map((activite) => activite.id);

    const [dispoJournee, dispoActivite] = await Promise.all([
      this.disponibiliteJourneeRepository.findByDates(datesDistinctes),
      this.disponibiliteActiviteRepository.findByActiviteIds(activiteIds),
    ]);

    const journeeParDate = indexerParCle(
      dispoJournee.filter((d) => d.utilisateurId === utilisateurConnecte.id),
      (d) => d.date,
    );
    const activiteParId = indexerParCle(
      dispoActivite.filter((d) => d.utilisateurId === utilisateurConnecte.id),
      (d) => d.activiteId,
    );

    const resoudre = (
      activite: Activite & { date: string },
    ): ActiviteAvecDisponibiliteDto => ({
      activite: toActiviteColonneDto(activite),
      disponibilite: fusionnerDisponibiliteEffective(
        activiteParId.get(activite.id),
        journeeParDate.get(activite.date),
      ),
    });

    const dernierePassee = dernierePasseeActivite
      ? resoudre(dernierePasseeActivite)
      : null;
    const activitesAVenirResolues = activitesAVenir.map(resoudre);

    const datesAVenirDistinctes = Array.from(
      new Set(activitesAVenirResolues.map((ligne) => ligne.activite.date)),
    ).slice(0, NOMBRE_PROCHAINES_DATES);

    const prochainesDates = datesAVenirDistinctes.map((date) => ({
      date,
      activites: activitesAVenirResolues.filter(
        (ligne) => ligne.activite.date === date,
      ),
    }));

    const totalAVenir = activitesAVenirResolues.length;
    const renseigneesAVenir = activitesAVenirResolues.filter(
      (ligne) => ligne.disponibilite.source !== "aucune",
    ).length;

    return {
      dernierePassee,
      prochainesDates,
      tableauDeBord: {
        totalAVenir,
        renseigneesAVenir,
        pourcentageRenseignement:
          totalAVenir === 0
            ? 0
            : Math.round((renseigneesAVenir / totalAVenir) * 100),
      },
    };
  }
}

function avecDateGuard(
  activite: Activite,
): activite is Activite & { date: string } {
  return activite.date !== undefined;
}

function avecDate(
  activite: Activite | null,
): (Activite & { date: string }) | null {
  return activite && avecDateGuard(activite) ? activite : null;
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
