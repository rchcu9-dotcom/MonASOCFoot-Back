import { Repository } from "../../shared/repositories/repository.interface";
import { RoleUtilisateur, Utilisateur } from "../entities/utilisateur.entity";

export interface UtilisateurRepository extends Repository<Utilisateur> {
  findByProviderId(providerId: string): Promise<Utilisateur | null>;
  updateRole(id: string, role: RoleUtilisateur): Promise<Utilisateur>;
  /**
   * Met à jour le profil personnel (date de naissance, numéro de licence) d'un utilisateur.
   * Une chaîne vide est normalisée en `null` en base (champ redevenu « non renseigné »).
   */
  updateProfil(
    id: string,
    profil: { dateNaissance?: string; numeroLicence?: string },
  ): Promise<Utilisateur>;
}
