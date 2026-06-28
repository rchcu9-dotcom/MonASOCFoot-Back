import { UtilisateurProvisioningService } from './utilisateur-provisioning.service';
import type { UtilisateurRepository } from '../../domain/utilisateur/repositories/utilisateur.repository.interface';
import type { Utilisateur } from '../../domain/utilisateur/entities/utilisateur.entity';
import type { AuthTokenPayload } from '../../domain/auth/entities/auth-token-payload.entity';

function makeRepository(overrides: {
  findByProviderId?: jest.Mock;
  save?: jest.Mock;
} = {}) {
  return {
    findByProviderId: overrides.findByProviderId ?? jest.fn(),
    save: overrides.save ?? jest.fn(),
  } as unknown as UtilisateurRepository;
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

describe('UtilisateurProvisioningService', () => {
  describe('provision', () => {
    it("crée un nouvel utilisateur avec le rôle 'joueur' quand aucun utilisateur n'existe pour ce providerId", async () => {
      const findByProviderId = jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'generated-id',
          providerId: 'provider-2',
          provider: 'google',
          displayName: 'Nouveau Joueur',
          role: 'joueur',
          dateApparition: '2026-06-28T00:00:00.000Z',
          derniereConnexion: '2026-06-28T00:00:00.000Z',
        });
      const save = jest.fn().mockResolvedValue(undefined);
      const repository = makeRepository({ findByProviderId, save });
      const service = new UtilisateurProvisioningService(repository);

      const payload: AuthTokenPayload = {
        uid: 'provider-2',
        provider: 'google',
        email: 'nouveau@example.com',
        displayName: 'Nouveau Joueur',
      };

      const result = await service.provision(payload);

      expect(save).toHaveBeenCalledTimes(1);
      const saved = save.mock.calls[0][0] as Utilisateur;
      expect(saved.providerId).toBe('provider-2');
      expect(saved.provider).toBe('google');
      expect(saved.role).toBe('joueur');
      expect(saved.displayName).toBe('Nouveau Joueur');
      expect(saved.email).toBe('nouveau@example.com');
      expect(findByProviderId).toHaveBeenCalledTimes(2);
      expect(findByProviderId).toHaveBeenNthCalledWith(1, 'provider-2');
      expect(findByProviderId).toHaveBeenNthCalledWith(2, 'provider-2');
      expect(result?.providerId).toBe('provider-2');
    });

    it('utilise "google" comme provider par défaut quand le payload ne le précise pas', async () => {
      const findByProviderId = jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      const save = jest.fn().mockResolvedValue(undefined);
      const repository = makeRepository({ findByProviderId, save });
      const service = new UtilisateurProvisioningService(repository);

      const payload: AuthTokenPayload = { uid: 'provider-3' };

      await service.provision(payload);

      const saved = save.mock.calls[0][0] as Utilisateur;
      expect(saved.provider).toBe('google');
      expect(saved.displayName).toBe('provider-3');
    });

    it("utilise displayName puis email puis uid comme fallback de displayName, dans cet ordre de priorité", async () => {
      const findByProviderId = jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      const save = jest.fn().mockResolvedValue(undefined);
      const repository = makeRepository({ findByProviderId, save });
      const service = new UtilisateurProvisioningService(repository);

      await service.provision({ uid: 'provider-4', email: 'fallback@example.com' });

      const saved = save.mock.calls[0][0] as Utilisateur;
      expect(saved.displayName).toBe('fallback@example.com');
    });

    it('met à jour uniquement derniereConnexion et conserve le rôle existant quand un utilisateur existe déjà', async () => {
      const findByProviderId = jest.fn().mockResolvedValue(existingUtilisateur);
      const save = jest.fn().mockResolvedValue(undefined);
      const repository = makeRepository({ findByProviderId, save });
      const service = new UtilisateurProvisioningService(repository);

      const payload: AuthTokenPayload = {
        uid: 'provider-1',
        provider: 'google',
        email: 'joueur@example.com',
        displayName: 'Joueur Un',
      };

      const result = await service.provision(payload);

      expect(save).toHaveBeenCalledTimes(1);
      const saved = save.mock.calls[0][0] as Utilisateur;
      expect(saved.role).toBe('admin');
      expect(saved.id).toBe(existingUtilisateur.id);
      expect(saved.derniereConnexion).not.toBe(existingUtilisateur.derniereConnexion);
      // findByProviderId n'est appelé qu'une seule fois (la branche "existing" renvoie directement
      // l'utilisateur trouvé initialement, sans re-fetch après le save).
      expect(findByProviderId).toHaveBeenCalledTimes(1);
      expect(result).toEqual(existingUtilisateur);
    });

    it('renvoie null si le nouvel utilisateur ne peut pas être relu après création (cas limite défensif)', async () => {
      const findByProviderId = jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      const save = jest.fn().mockResolvedValue(undefined);
      const repository = makeRepository({ findByProviderId, save });
      const service = new UtilisateurProvisioningService(repository);

      const result = await service.provision({ uid: 'provider-5' });

      expect(result).toBeNull();
    });
  });
});
