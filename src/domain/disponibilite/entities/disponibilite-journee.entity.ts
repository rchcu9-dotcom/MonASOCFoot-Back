import { StatutDisponibilite } from "./statut-disponibilite.enum";

export interface DisponibiliteJournee {
  id: string;
  utilisateurId: string;
  /** ISO 8601 — format yyyy-mm-dd. */
  date: string;
  statut: StatutDisponibilite;
  commentaire?: string;
}
