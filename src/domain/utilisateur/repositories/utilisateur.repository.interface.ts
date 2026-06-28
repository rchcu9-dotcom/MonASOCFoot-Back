import { Repository } from "../../shared/repositories/repository.interface";
import { RoleUtilisateur, Utilisateur } from "../entities/utilisateur.entity";

export interface UtilisateurRepository extends Repository<Utilisateur> {
  findByProviderId(providerId: string): Promise<Utilisateur | null>;
  updateRole(id: string, role: RoleUtilisateur): Promise<Utilisateur>;
}
