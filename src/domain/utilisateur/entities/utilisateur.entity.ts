export type RoleUtilisateur = "admin" | "joueur";

/** 'dev' : connexion de secours locale (POST /auth/dev-login), désactivée en production. */
export type ProviderUtilisateur = "google" | "facebook" | "dev";

export interface Utilisateur {
  id: string;
  /** Identifiant unique fourni par le provider OAuth (Google UID, Facebook UID, ...). */
  providerId: string;
  /** Provider OAuth ayant authentifié l'utilisateur. */
  provider: ProviderUtilisateur;
  displayName: string;
  email?: string;
  role: RoleUtilisateur;
  /** ISO 8601 — première authentification connue. */
  dateApparition: string;
  /** ISO 8601 */
  derniereConnexion?: string;
  /** ISO 8601 — yyyy-mm-dd. Renseignée par l'utilisateur lui-même depuis « Mon profil ». */
  dateNaissance?: string;
  /** Numéro de licence FFF, chaîne libre. Renseigné par l'utilisateur lui-même depuis « Mon profil ». */
  numeroLicence?: string;
}
