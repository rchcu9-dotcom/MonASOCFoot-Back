import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ModifierRoleUtilisateurUseCase } from './modifier-role-utilisateur.use-case';
import type { Utilisateur } from '../../../domain/utilisateur/entities/utilisateur.entity';
import type { UtilisateurRepository } from '../../../domain/utilisateur/repositories/utilisateur.repository.interface';
import type { ModifierRoleUtilisateurDto } from '../dto/modifier-role-utilisateur.dto';

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
    findById: jest.fn().mockResolvedValue(makeUtilisateur()),
    save: jest.fn(),
    findByProviderId: jest.fn().mockResolvedValue(null),
    updateRole: jest.fn((id: string, role: Utilisateur['role']) =>
      Promise.resolve(makeUtilisateur({ id, role })),
    ),
    ...overrides,
  } as unknown as UtilisateurRepository;

  return { useCase: new ModifierRoleUtilisateurUseCase(utilisateurRepository), utilisateurRepository };
}

describe('ModifierRoleUtilisateurUseCase', () => {
  it("lève NotFoundException quand l'utilisateur cible n'existe pas, sans appeler updateRole", async () => {
    const { useCase, utilisateurRepository } = makeUseCase({
      findById: jest.fn().mockResolvedValue(null),
    });
    const dto: ModifierRoleUtilisateurDto = { role: 'admin' };

    await expect(useCase.execute('inconnu', dto, 'admin-connecte')).rejects.toThrow(NotFoundException);
    expect(utilisateurRepository.updateRole).not.toHaveBeenCalled();
  });

  it('promeut un joueur en admin', async () => {
    const { useCase, utilisateurRepository } = makeUseCase({
      findById: jest.fn().mockResolvedValue(makeUtilisateur({ id: 'user-1', role: 'joueur' })),
    });

    const result = await useCase.execute('user-1', { role: 'admin' }, 'admin-connecte');

    expect(utilisateurRepository.updateRole).toHaveBeenCalledWith('user-1', 'admin');
    expect(result.role).toBe('admin');
  });

  it("rétrograde un autre admin en joueur (autorisé quand id !== idUtilisateurConnecte)", async () => {
    const { useCase, utilisateurRepository } = makeUseCase({
      findById: jest.fn().mockResolvedValue(makeUtilisateur({ id: 'autre-admin', role: 'admin' })),
    });

    await useCase.execute('autre-admin', { role: 'joueur' }, 'admin-connecte');

    expect(utilisateurRepository.updateRole).toHaveBeenCalledWith('autre-admin', 'joueur');
  });

  it("rejette (400) la tentative d'un admin de retirer son propre rôle admin, sans appeler updateRole", async () => {
    const { useCase, utilisateurRepository } = makeUseCase({
      findById: jest.fn().mockResolvedValue(makeUtilisateur({ id: 'admin-connecte', role: 'admin' })),
    });

    await expect(
      useCase.execute('admin-connecte', { role: 'joueur' }, 'admin-connecte'),
    ).rejects.toThrow(BadRequestException);
    expect(utilisateurRepository.updateRole).not.toHaveBeenCalled();
  });

  it('autorise un admin à se "promouvoir" lui-même en admin (no-op fonctionnel, pas une démotion)', async () => {
    const { useCase, utilisateurRepository } = makeUseCase({
      findById: jest.fn().mockResolvedValue(makeUtilisateur({ id: 'admin-connecte', role: 'admin' })),
    });

    await useCase.execute('admin-connecte', { role: 'admin' }, 'admin-connecte');

    expect(utilisateurRepository.updateRole).toHaveBeenCalledWith('admin-connecte', 'admin');
  });

  it("renvoie l'utilisateur tel que renvoyé par le repository", async () => {
    const utilisateurMisAJour = makeUtilisateur({ id: 'user-1', role: 'admin' });
    const { useCase } = makeUseCase({
      findById: jest.fn().mockResolvedValue(makeUtilisateur({ id: 'user-1', role: 'joueur' })),
      updateRole: jest.fn().mockResolvedValue(utilisateurMisAJour),
    });

    const result = await useCase.execute('user-1', { role: 'admin' }, 'admin-connecte');

    expect(result).toBe(utilisateurMisAJour);
  });
});
