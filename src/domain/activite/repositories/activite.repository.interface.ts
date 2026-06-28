import { Repository } from "../../shared/repositories/repository.interface";
import { Activite } from "../entities/activite.entity";

export interface ActiviteRepository extends Repository<Activite> {
  /** Activités dont la date est >= `fromDate` (ISO yyyy-mm-dd), triées par date croissante. */
  findUpcoming(fromDate: string): Promise<Activite[]>;
  /** Supprime l'activité. Lève `NotFoundException` si elle n'existe pas. */
  deleteById(id: string): Promise<void>;
  /** Recherche par identifiant externe (clé de dédup de l'import automatique). */
  findByIdExterne(idExterne: string): Promise<Activite | null>;
}
