import { AuthTokenPayload } from "../entities/auth-token-payload.entity";

export interface AuthServicePort {
  validateToken(token: string): Promise<AuthTokenPayload | null>;
}
