import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { AdminGuard } from './admin.guard';
import type { AuthServicePort } from '../../../domain/auth/ports/auth-service.port';
import type { UtilisateurProvisioningService } from '../../auth/utilisateur-provisioning.service';
import type { Utilisateur } from '../../../domain/utilisateur/entities/utilisateur.entity';

function makeContext(headers: Record<string, string> = {}): {
  context: ExecutionContext;
  request: { headers: Record<string, string>; utilisateur?: Utilisateur };
} {
  const request: { headers: Record<string, string>; utilisateur?: Utilisateur } = { headers };

  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;

  return { context, request };
}

function makeGuard(overrides: {
  requireAdmin?: boolean;
  validateToken?: jest.Mock;
  provision?: jest.Mock;
} = {}) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(overrides.requireAdmin ?? true),
  } as unknown as Reflector;

  const authService = {
    validateToken: overrides.validateToken ?? jest.fn(),
  } as unknown as AuthServicePort;

  const provisioningService = {
    provision: overrides.provision ?? jest.fn(),
  } as unknown as UtilisateurProvisioningService;

  const guard = new AdminGuard(reflector, authService, provisioningService);

  return { guard, reflector, authService, provisioningService };
}

const admin: Utilisateur = {
  id: 'admin-1',
  providerId: 'provider-1',
  provider: 'google',
  displayName: 'Admin Un',
  role: 'admin',
  dateApparition: '2026-01-01T00:00:00.000Z',
};

describe('AdminGuard', () => {
  it("retourne true sans vérifier de token quand @RequireAdmin() est absent", async () => {
    const { guard, authService } = makeGuard({ requireAdmin: false });
    const { context } = makeContext();

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(authService.validateToken).not.toHaveBeenCalled();
  });

  it("lève UnauthorizedException quand aucun header Authorization n'est présent", async () => {
    const { guard } = makeGuard({ requireAdmin: true });
    const { context } = makeContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('lève UnauthorizedException quand le header Authorization ne commence pas par "Bearer "', async () => {
    const { guard } = makeGuard({ requireAdmin: true });
    const { context } = makeContext({ authorization: 'Basic abc123' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('lève UnauthorizedException quand le token est vide après "Bearer "', async () => {
    const { guard } = makeGuard({ requireAdmin: true });
    const { context } = makeContext({ authorization: 'Bearer    ' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('lève UnauthorizedException quand le token est invalide (validateToken renvoie null)', async () => {
    const validateToken = jest.fn().mockResolvedValue(null);
    const { guard } = makeGuard({ requireAdmin: true, validateToken });
    const { context } = makeContext({ authorization: 'Bearer token-invalide' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(validateToken).toHaveBeenCalledWith('token-invalide');
  });

  it("lève ForbiddenException quand l'auto-provisioning échoue (provision renvoie null) — AdminGuard ne distingue pas ce cas d'un rôle insuffisant, à la différence de AuthGuard", async () => {
    const validateToken = jest.fn().mockResolvedValue({ uid: 'provider-1' });
    const provision = jest.fn().mockResolvedValue(null);
    const { guard } = makeGuard({ requireAdmin: true, validateToken, provision });
    const { context } = makeContext({ authorization: 'Bearer token-valide' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('lève ForbiddenException quand l\'utilisateur provisionné a le rôle "joueur"', async () => {
    const joueur: Utilisateur = { ...admin, role: 'joueur' };
    const validateToken = jest.fn().mockResolvedValue({ uid: 'provider-1' });
    const provision = jest.fn().mockResolvedValue(joueur);
    const { guard } = makeGuard({ requireAdmin: true, validateToken, provision });
    const { context } = makeContext({ authorization: 'Bearer token-valide' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('retourne true et attache request.utilisateur quand le token est valide et le rôle est "admin"', async () => {
    const validateToken = jest.fn().mockResolvedValue({ uid: 'provider-1' });
    const provision = jest.fn().mockResolvedValue(admin);
    const { guard } = makeGuard({ requireAdmin: true, validateToken, provision });
    const { context, request } = makeContext({ authorization: 'Bearer token-valide' });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.utilisateur).toEqual(admin);
  });
});
