import { Inject, Injectable } from "@nestjs/common";
import { Activite } from "../../../domain/activite/entities/activite.entity";
import type { ActiviteRepository } from "../../../domain/activite/repositories/activite.repository.interface";
import { ACTIVITE_REPOSITORY } from "../../../domain/shared/tokens";

const SEMAINES_PAR_DEFAUT = 8;
const JOURS_PAR_SEMAINE = 7;

/**
 * Agrège en un seul appel les deux colonnes de la page de planification admin :
 * - `sansDate` : toutes les activités sans date assignée (pas de fenêtre temporelle, puisque
 *   sans date il n'y a rien à borner) ;
 * - `calendrier` : les activités à venir (à partir d'aujourd'hui) dans la fenêtre temporelle
 *   demandée (`semaines`, 8 par défaut, extensible par tranches de 4 via « Charger plus »).
 *
 * La borne haute est calculée et appliquée côté back plutôt que de tout charger et filtrer côté
 * front (cf. décision Architect).
 */
@Injectable()
export class ConsulterPlanificationActivitesUseCase {
  constructor(
    @Inject(ACTIVITE_REPOSITORY)
    private readonly activites: ActiviteRepository,
  ) {}

  async execute(
    semaines: number = SEMAINES_PAR_DEFAUT,
  ): Promise<{ sansDate: Activite[]; calendrier: Activite[] }> {
    const aujourdHui = new Date().toISOString().slice(0, 10);
    const toDate = ajouterJours(aujourdHui, semaines * JOURS_PAR_SEMAINE);

    const [sansDate, aVenir] = await Promise.all([
      this.activites.findSansDate(),
      this.activites.findUpcoming(aujourdHui),
    ]);

    const calendrier = aVenir.filter(
      (activite) => (activite.date ?? "") <= toDate,
    );

    return { sansDate, calendrier };
  }
}

function ajouterJours(dateIso: string, jours: number): string {
  const date = new Date(`${dateIso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + jours);
  return date.toISOString().slice(0, 10);
}
