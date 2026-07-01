import { ActiviteDto } from "./activite.dto";

/** Réponse de `GET /activites/planification` — agrégation en un seul appel pour la page admin. */
export interface PlanificationActivitesDto {
  /** Activités sans date assignée (colonne « Sans date »). */
  sansDate: ActiviteDto[];
  /** Activités à venir dans la fenêtre temporelle demandée (colonne « Calendrier »). */
  calendrier: ActiviteDto[];
}
