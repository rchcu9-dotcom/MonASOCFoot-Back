import { Repository } from "../../shared/repositories/repository.interface";
import { Activite } from "../entities/activite.entity";

export interface ActiviteRepository extends Repository<Activite> {
  /**
   * Activités dont la date est >= `fromDate` (ISO yyyy-mm-dd), triées par date croissante.
   * Exclut explicitement les activités sans date (`date: null`) — elles ne sont par
   * construction « à venir » pour aucun joueur tant qu'elles ne sont pas planifiées.
   */
  findUpcoming(fromDate: string): Promise<Activite[]>;
  /** Activités sans date assignée (`date: null`), pour la colonne « Sans date » de la planification admin. */
  findSansDate(): Promise<Activite[]>;
  /** Supprime l'activité. Lève `NotFoundException` si elle n'existe pas. */
  deleteById(id: string): Promise<void>;
  /** Recherche par identifiant externe (clé de dédup de l'import automatique). */
  findByIdExterne(idExterne: string): Promise<Activite | null>;
}
