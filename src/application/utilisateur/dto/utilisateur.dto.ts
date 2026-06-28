import {
  RoleUtilisateur,
  Utilisateur,
} from "../../../domain/utilisateur/entities/utilisateur.entity";

export interface UtilisateurDto {
  id: string;
  providerId: string;
  provider: string;
  displayName: string;
  email?: string;
  role: RoleUtilisateur;
  dateApparition: string;
  derniereConnexion?: string;
}

export function toUtilisateurDto(utilisateur: Utilisateur): UtilisateurDto {
  return { ...utilisateur };
}
