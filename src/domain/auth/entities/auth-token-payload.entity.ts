export interface AuthTokenPayload {
  /** Identifiant unique fourni par le provider OAuth (Google UID, etc.). */
  uid: string;
  provider?: string;
  email?: string;
  displayName?: string;
}
