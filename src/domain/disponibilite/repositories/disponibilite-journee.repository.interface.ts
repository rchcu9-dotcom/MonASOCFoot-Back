import { Repository } from "../../shared/repositories/repository.interface";
import { DisponibiliteJournee } from "../entities/disponibilite-journee.entity";

export interface DisponibiliteJourneeRepository extends Repository<DisponibiliteJournee> {
  /** Toutes les disponibilités de journée dont la date appartient à `dates` (ISO yyyy-mm-dd). */
  findByDates(dates: string[]): Promise<DisponibiliteJournee[]>;
  /** Recherche par clé naturelle (utilisateur, date) — nécessaire pour l'upsert. */
  findByUtilisateurEtDate(
    utilisateurId: string,
    date: string,
  ): Promise<DisponibiliteJournee | null>;
  /** Toutes les disponibilités de journée déclarées par `utilisateurId`. */
  findByUtilisateurId(utilisateurId: string): Promise<DisponibiliteJournee[]>;
}
