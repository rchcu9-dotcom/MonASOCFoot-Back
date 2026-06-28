import { ListerUtilisateursUseCase } from './lister-utilisateurs.use-case';
import type { Utilisateur } from '../../../domain/utilisateur/entities/utilisateur.entity';
import type { UtilisateurRepository } from '../../../domain/utilisateur/repositories/utilisateur.repository.interface';

function makeUtilisateur(overrides: Partial<Utilisateur> = {}): Utilisateur {
  return {
    id: 'user-1',
    providerId: 'provider-1',
    provider: 'google',
    displayName: 'Joueur Un',
    role: 'joueur',
    dateApparition: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeUseCase(overrides: Partial<UtilisateurRepository> = {}) {
  const utilisateurRepository = {
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    save: jest.fn(),
    findByProviderId: jest.fn().mockResolvedValue(null),
    updateRole: jest.fn(),
    ...overrides,
  } as unknown as UtilisateurRepository;

  return { useCase: new ListerUtilisateursUseCase(utilisateurRepository), utilisateurRepository };
}

describe('ListerUtilisateursUseCase', () => {
  it('délègue à findAll() du repository', async () => {
    const { useCase, utilisateurRepository } = makeUseCase();

    await useCase.execute();

    expect(utilisateurRepository.findAll).toHaveBeenCalledTimes(1);
  });

  it('renvoie la liste telle que retournée par le repository', async () => {
    const u1 = makeUtilisateur({ id: 'u1' });
    const u2 = makeUtilisateur({ id: 'u2', role: 'admin' });
    const { useCase } = makeUseCase({ findAll: jest.fn().mockResolvedValue([u1, u2]) });

    const result = await useCase.execute();

    expect(result).toEqual([u1, u2]);
  });

  it("renvoie une liste vide quand aucun utilisateur ne s'est jamais connecté", async () => {
    const { useCase } = makeUseCase();

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });
});
