import { Repository } from "../../shared/repositories/repository.interface";
import { DisponibiliteActivite } from "../entities/disponibilite-activite.entity";

export interface DisponibiliteActiviteRepository extends Repository<DisponibiliteActivite> {
  /** Toutes les disponibilités d'activité dont `activiteId` appartient à `activiteIds`. */
  findByActiviteIds(activiteIds: string[]): Promise<DisponibiliteActivite[]>;
  /** Recherche par clé naturelle (utilisateur, activité) — nécessaire pour l'upsert. */
  findByUtilisateurEtActivite(
    utilisateurId: string,
    activiteId: string,
  ): Promise<DisponibiliteActivite | null>;
  /** Supprime la surcharge. Lève `NotFoundException` si elle n'existe pas. */
  deleteById(id: string): Promise<void>;
}
