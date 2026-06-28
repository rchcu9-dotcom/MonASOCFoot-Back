import type { JwtService } from '@nestjs/jwt';
import { JwtAuthService } from './jwt-auth.service';
import type { AuthTokenPayload } from '../../domain/auth/entities/auth-token-payload.entity';

function makeService(verifyAsync?: jest.Mock) {
  const jwtService = {
    verifyAsync: verifyAsync ?? jest.fn(),
  } as unknown as JwtService;

  return { service: new JwtAuthService(jwtService), jwtService };
}

describe('JwtAuthService', () => {
  describe('validateToken', () => {
    it('renvoie null sans appeler verifyAsync quand le token est une chaîne vide', async () => {
      const verifyAsync = jest.fn();
      const { service, jwtService } = makeService(verifyAsync);

      const result = await service.validateToken('');

      expect(result).toBeNull();
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('renvoie le payload décodé quand verifyAsync réussit', async () => {
      const payload: AuthTokenPayload = {
        uid: 'provider-1',
        provider: 'google',
        email: 'joueur@example.com',
        displayName: 'Joueur Un',
      };
      const verifyAsync = jest.fn().mockResolvedValue(payload);
      const { service } = makeService(verifyAsync);

      const result = await service.validateToken('token-valide');

      expect(verifyAsync).toHaveBeenCalledWith('token-valide');
      expect(result).toEqual(payload);
    });

    it('renvoie null quand verifyAsync rejette (token invalide ou expiré)', async () => {
      const verifyAsync = jest.fn().mockRejectedValue(new Error('jwt expired'));
      const { service } = makeService(verifyAsync);

      const result = await service.validateToken('token-expire');

      expect(result).toBeNull();
    });
  });
});
