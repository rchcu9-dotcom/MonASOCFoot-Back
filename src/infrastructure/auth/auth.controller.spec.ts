import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';
import type { OAuthProfile } from '@rchcu9-dotcom/auth-passport-back';
import { AuthController } from './auth.controller';
import type { UtilisateurRepository } from '../../domain/utilisateur/repositories/utilisateur.repository.interface';
import type { Utilisateur } from '../../domain/utilisateur/entities/utilisateur.entity';
import type { DevLoginDto } from './dto/dev-login.dto';

function makeRepository(overrides: {
  findByProviderId?: jest.Mock;
  save?: jest.Mock;
} = {}) {
  return {
    findByProviderId: overrides.findByProviderId ?? jest.fn(),
    save: overrides.save ?? jest.fn(),
  } as unknown as UtilisateurRepository;
}

function makeController(overrides: {
  signAsync?: jest.Mock;
  verifyAsync?: jest.Mock;
  findByProviderId?: jest.Mock;
  save?: jest.Mock;
} = {}) {
  const jwtService = {
    signAsync: overrides.signAsync ?? jest.fn().mockResolvedValue('signed-jwt'),
    verifyAsync: overrides.verifyAsync ?? jest.fn(),
  } as unknown as JwtService;

  const utilisateurRepository = makeRepository({
    findByProviderId: overrides.findByProviderId,
    save: overrides.save,
  });

  const controller = new AuthController(jwtService, utilisateurRepository);

  return { controller, jwtService, utilisateurRepository };
}

const existingUtilisateur: Utilisateur = {
  id: 'user-1',
  providerId: 'provider-1',
  provider: 'google',
  displayName: 'Joueur Un',
  email: 'joueur@example.com',
  role: 'admin',
  dateApparition: '2026-01-01T00:00:00.000Z',
  derniereConnexion: '2026-06-01T00:00:00.000Z',
};

describe('AuthController', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('googleCallback', () => {
    it('upsert un nouvel utilisateur depuis le profil OAuth, signe un JWT et redirige vers FRONT_URL/auth/callback?token=...', async () => {
      process.env.FRONT_URL = 'http://front.example.test';
      const findByProviderId = jest.fn().mockResolvedValue(null);
      const save = jest.fn().mockImplementation((u: Utilisateur) => Promise.resolve(u));
      const signAsync = jest.fn().mockResolvedValue('jwt-google');
      const { controller } = makeController({ findByProviderId, save, signAsync });

      const profile: OAuthProfile = {
        providerId: 'google-uid-1',
        displayName: 'Nouveau Joueur',
        email: 'nouveau@example.com',
      } as OAuthProfile;
      const req = { user: profile } as unknown as Request;
      const redirect = jest.fn();
      const res = { redirect } as unknown as Response;

      await controller.googleCallback(req, res);

      expect(save).toHaveBeenCalledTimes(1);
      const saved = save.mock.calls[0][0] as Utilisateur;
      expect(saved.providerId).toBe('google-uid-1');
      expect(saved.provider).toBe('google');
      expect(saved.role).toBe('joueur');
      expect(signAsync).toHaveBeenCalledWith({
        uid: 'google-uid-1',
        provider: 'google',
        email: 'nouveau@example.com',
        displayName: 'Nouveau Joueur',
      });
      expect(redirect).toHaveBeenCalledWith(
        'http://front.example.test/auth/callback?token=jwt-google',
      );
    });

    it('utilise http://localhost:5193 comme FRONT_URL par défaut quand la variable est absente', async () => {
      delete process.env.FRONT_URL;
      const findByProviderId = jest.fn().mockResolvedValue(null);
      const save = jest.fn().mockImplementation((u: Utilisateur) => Promise.resolve(u));
      const { controller } = makeController({ findByProviderId, save });

      const profile: OAuthProfile = {
        providerId: 'google-uid-2',
        displayName: 'Joueur',
        email: 'joueur2@example.com',
      } as OAuthProfile;
      const req = { user: profile } as unknown as Request;
      const redirect = jest.fn();
      const res = { redirect } as unknown as Response;

      await controller.googleCallback(req, res);

      expect(redirect).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:5193/auth/callback?token='),
      );
    });

    it('conserve le rôle existant (admin) pour un utilisateur déjà connu, sans le re-décider via ADMIN_BOOTSTRAP_EMAIL', async () => {
      process.env.ADMIN_BOOTSTRAP_EMAIL = 'autre@example.com';
      const findByProviderId = jest.fn().mockResolvedValue(existingUtilisateur);
      const save = jest.fn().mockImplementation((u: Utilisateur) => Promise.resolve(u));
      const { controller } = makeController({ findByProviderId, save });

      const profile: OAuthProfile = {
        providerId: 'provider-1',
        displayName: 'Joueur Un',
        email: 'joueur@example.com',
      } as OAuthProfile;
      const req = { user: profile } as unknown as Request;
      const res = { redirect: jest.fn() } as unknown as Response;

      await controller.googleCallback(req, res);

      const saved = save.mock.calls[0][0] as Utilisateur;
      expect(saved.role).toBe('admin');
      expect(saved.id).toBe(existingUtilisateur.id);
    });
  });

  describe('devLogin', () => {
    it('lève ForbiddenException quand NODE_ENV=production et ENABLE_DEV_LOGIN n\'est pas "true"', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ENABLE_DEV_LOGIN;
      const { controller, utilisateurRepository } = makeController();
      const dto: DevLoginDto = { email: 'joueur@example.com', displayName: 'Joueur' };

      await expect(controller.devLogin(dto)).rejects.toThrow(ForbiddenException);
      expect(utilisateurRepository.save).not.toHaveBeenCalled();
    });

    it('autorise dev-login en production quand ENABLE_DEV_LOGIN="true"', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ENABLE_DEV_LOGIN = 'true';
      const findByProviderId = jest.fn().mockResolvedValue(null);
      const save = jest.fn().mockImplementation((u: Utilisateur) => Promise.resolve(u));
      const { controller } = makeController({ findByProviderId, save });
      const dto: DevLoginDto = { email: 'joueur@example.com', displayName: 'Joueur' };

      const result = await controller.devLogin(dto);

      expect(result).toEqual({ token: 'signed-jwt' });
    });

    it('autorise dev-login hors production même sans ENABLE_DEV_LOGIN', async () => {
      process.env.NODE_ENV = 'test';
      delete process.env.ENABLE_DEV_LOGIN;
      const findByProviderId = jest.fn().mockResolvedValue(null);
      const save = jest.fn().mockImplementation((u: Utilisateur) => Promise.resolve(u));
      const { controller } = makeController({ findByProviderId, save });
      const dto: DevLoginDto = { email: 'joueur@example.com', displayName: 'Joueur' };

      const result = await controller.devLogin(dto);

      expect(result).toEqual({ token: 'signed-jwt' });
    });

    it('construit le providerId sous la forme "dev-<email>" et le provider "dev"', async () => {
      process.env.NODE_ENV = 'test';
      const findByProviderId = jest.fn().mockResolvedValue(null);
      const save = jest.fn().mockImplementation((u: Utilisateur) => Promise.resolve(u));
      const { controller } = makeController({ findByProviderId, save });
      const dto: DevLoginDto = { email: 'joueur@example.com', displayName: 'Joueur' };

      await controller.devLogin(dto);

      expect(findByProviderId).toHaveBeenCalledWith('dev-joueur@example.com');
      const saved = save.mock.calls[0][0] as Utilisateur;
      expect(saved.providerId).toBe('dev-joueur@example.com');
      expect(saved.provider).toBe('dev');
    });

    it("attribue le rôle 'admin' à un nouvel utilisateur dont l'email correspond à ADMIN_BOOTSTRAP_EMAIL", async () => {
      process.env.NODE_ENV = 'test';
      process.env.ADMIN_BOOTSTRAP_EMAIL = 'boss@example.com';
      const findByProviderId = jest.fn().mockResolvedValue(null);
      const save = jest.fn().mockImplementation((u: Utilisateur) => Promise.resolve(u));
      const { controller } = makeController({ findByProviderId, save });
      const dto: DevLoginDto = { email: 'boss@example.com', displayName: 'Le Boss' };

      await controller.devLogin(dto);

      const saved = save.mock.calls[0][0] as Utilisateur;
      expect(saved.role).toBe('admin');
    });

    it("attribue le rôle 'joueur' à un nouvel utilisateur dont l'email ne correspond pas à ADMIN_BOOTSTRAP_EMAIL", async () => {
      process.env.NODE_ENV = 'test';
      process.env.ADMIN_BOOTSTRAP_EMAIL = 'boss@example.com';
      const findByProviderId = jest.fn().mockResolvedValue(null);
      const save = jest.fn().mockImplementation((u: Utilisateur) => Promise.resolve(u));
      const { controller } = makeController({ findByProviderId, save });
      const dto: DevLoginDto = { email: 'pasboss@example.com', displayName: 'Pas Le Boss' };

      await controller.devLogin(dto);

      const saved = save.mock.calls[0][0] as Utilisateur;
      expect(saved.role).toBe('joueur');
    });

    it("attribue le rôle 'joueur' quand ADMIN_BOOTSTRAP_EMAIL n'est pas défini, même si un email est fourni", async () => {
      process.env.NODE_ENV = 'test';
      delete process.env.ADMIN_BOOTSTRAP_EMAIL;
      const findByProviderId = jest.fn().mockResolvedValue(null);
      const save = jest.fn().mockImplementation((u: Utilisateur) => Promise.resolve(u));
      const { controller } = makeController({ findByProviderId, save });
      const dto: DevLoginDto = { email: 'quiimporte@example.com', displayName: 'Quelqu\'un' };

      await controller.devLogin(dto);

      const saved = save.mock.calls[0][0] as Utilisateur;
      expect(saved.role).toBe('joueur');
    });

    it("conserve le rôle existant d'un utilisateur dev déjà connu, même s'il devient égal à ADMIN_BOOTSTRAP_EMAIL après coup", async () => {
      process.env.NODE_ENV = 'test';
      process.env.ADMIN_BOOTSTRAP_EMAIL = 'joueur@example.com';
      const utilisateurJoueurExistant: Utilisateur = { ...existingUtilisateur, role: 'joueur' };
      const findByProviderId = jest.fn().mockResolvedValue(utilisateurJoueurExistant);
      const save = jest.fn().mockImplementation((u: Utilisateur) => Promise.resolve(u));
      const { controller } = makeController({ findByProviderId, save });
      const dto: DevLoginDto = { email: 'joueur@example.com', displayName: 'Joueur Un' };

      await controller.devLogin(dto);

      const saved = save.mock.calls[0][0] as Utilisateur;
      expect(saved.role).toBe('joueur');
    });
  });

  describe('me', () => {
    function makeRequest(authorization?: string): Request {
      return { headers: authorization ? { authorization } : {} } as unknown as Request;
    }

    it("lève UnauthorizedException quand aucun header Authorization n'est présent", async () => {
      const { controller } = makeController();

      await expect(controller.me(makeRequest())).rejects.toThrow(UnauthorizedException);
    });

    it('lève UnauthorizedException quand le header ne commence pas par "Bearer "', async () => {
      const { controller } = makeController();

      await expect(controller.me(makeRequest('Basic abc'))).rejects.toThrow(UnauthorizedException);
    });

    it('lève UnauthorizedException quand le token est vide après "Bearer "', async () => {
      const { controller } = makeController();

      await expect(controller.me(makeRequest('Bearer   '))).rejects.toThrow(UnauthorizedException);
    });

    it('lève UnauthorizedException quand verifyAsync rejette (token invalide)', async () => {
      const verifyAsync = jest.fn().mockRejectedValue(new Error('jwt malformed'));
      const { controller } = makeController({ verifyAsync });

      await expect(controller.me(makeRequest('Bearer invalide'))).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("lève UnauthorizedException quand l'utilisateur n'est pas trouvé pour le providerId du payload", async () => {
      const verifyAsync = jest.fn().mockResolvedValue({ uid: 'provider-inconnu' });
      const findByProviderId = jest.fn().mockResolvedValue(null);
      const { controller } = makeController({ verifyAsync, findByProviderId });

      await expect(controller.me(makeRequest('Bearer valide'))).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("renvoie l'utilisateur correspondant au providerId du payload quand le token est valide", async () => {
      const verifyAsync = jest.fn().mockResolvedValue({ uid: 'provider-1' });
      const findByProviderId = jest.fn().mockResolvedValue(existingUtilisateur);
      const { controller } = makeController({ verifyAsync, findByProviderId });

      const result = await controller.me(makeRequest('Bearer valide'));

      expect(findByProviderId).toHaveBeenCalledWith('provider-1');
      expect(result).toEqual(existingUtilisateur);
    });
  });
});
