import { Repository } from "../../shared/repositories/repository.interface";
import { DisponibiliteActivite } from "../entities/disponibilite-activite.entity";

export interface DisponibiliteActiviteRepository extends Repository<DisponibiliteActivite> {
  /** Toutes les disponibilités d'activité dont `activiteId` appartient à `activiteIds`. */
  findByActiviteIds(activiteIds: string[]): Promise<DisponibiliteActivite[]>;
}
