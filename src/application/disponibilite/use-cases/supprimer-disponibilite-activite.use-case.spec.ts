import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SupprimerDisponibiliteActiviteUseCase } from './supprimer-disponibilite-activite.use-case';
import type { DisponibiliteActivite } from '../../../domain/disponibilite/entities/disponibilite-activite.entity';
import type { DisponibiliteActiviteRepository } from '../../../domain/disponibilite/repositories/disponibilite-activite.repository.interface';
import type { Utilisateur } from '../../../domain/utilisateur/entities/utilisateur.entity';

function makeUtilisateur(overrides: Partial<Utilisateur> = {}): Utilisateur {
  return {
    id: 'joueur-1',
    providerId: 'provider-1',
    provider: 'google',
    displayName: 'Joueur Un',
    role: 'joueur',
    dateApparition: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeSurcharge(overrides: Partial<DisponibiliteActivite> = {}): DisponibiliteActivite {
  return {
    id: 'dispo-existante',
    utilisateurId: 'joueur-1',
    activiteId: 'activite-1',
    statut: 'present',
    ...overrides,
  };
}

function makeUseCase(options: { disponibilites?: Partial<DisponibiliteActiviteRepository> } = {}) {
  const disponibiliteRepository = {
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    save: jest.fn(),
    findByActiviteIds: jest.fn().mockResolvedValue([]),
    findByUtilisateurEtActivite: jest.fn().mockResolvedValue(makeSurcharge()),
    deleteById: jest.fn().mockResolvedValue(undefined),
    ...options.disponibilites,
  } as unknown as DisponibiliteActiviteRepository;

  return {
    useCase: new SupprimerDisponibiliteActiviteUseCase(disponibiliteRepository),
    disponibiliteRepository,
  };
}

describe('SupprimerDisponibiliteActiviteUseCase', () => {
  it("supprime la surcharge existante de l'utilisateur connecté quand aucun utilisateurId n'est fourni", async () => {
    const { useCase, disponibiliteRepository } = makeUseCase();

    await useCase.execute('activite-1', undefined, makeUtilisateur({ id: 'joueur-1' }));

    expect(disponibiliteRepository.findByUtilisateurEtActivite).toHaveBeenCalledWith(
      'joueur-1',
      'activite-1',
    );
    expect(disponibiliteRepository.deleteById).toHaveBeenCalledWith('dispo-existante');
  });

  it("lève NotFoundException quand aucune surcharge n'existe pour la cible, sans appeler deleteById", async () => {
    const { useCase, disponibiliteRepository } = makeUseCase({
      disponibilites: { findByUtilisateurEtActivite: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      useCase.execute('activite-1', undefined, makeUtilisateur()),
    ).rejects.toThrow(NotFoundException);
    expect(disponibiliteRepository.deleteById).not.toHaveBeenCalled();
  });

  it("lève ForbiddenException quand un joueur tente de supprimer la surcharge d'un autre utilisateur, sans appeler deleteById", async () => {
    const { useCase, disponibiliteRepository } = makeUseCase();
    const joueur = makeUtilisateur({ id: 'joueur-1', role: 'joueur' });

    await expect(
      useCase.execute('activite-1', 'autre-joueur', joueur),
    ).rejects.toThrow(ForbiddenException);
    expect(disponibiliteRepository.findByUtilisateurEtActivite).not.toHaveBeenCalled();
    expect(disponibiliteRepository.deleteById).not.toHaveBeenCalled();
  });

  it("autorise un admin à supprimer la surcharge d'un autre utilisateur", async () => {
    const { useCase, disponibiliteRepository } = makeUseCase({
      disponibilites: {
        findByUtilisateurEtActivite: jest
          .fn()
          .mockResolvedValue(makeSurcharge({ id: 'dispo-cible', utilisateurId: 'joueur-cible' })),
      },
    });
    const admin = makeUtilisateur({ id: 'admin-1', role: 'admin' });

    await useCase.execute('activite-1', 'joueur-cible', admin);

    expect(disponibiliteRepository.findByUtilisateurEtActivite).toHaveBeenCalledWith(
      'joueur-cible',
      'activite-1',
    );
    expect(disponibiliteRepository.deleteById).toHaveBeenCalledWith('dispo-cible');
  });
});
