import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  DeclarerDisponibiliteActiviteUseCase,
  resoudreUtilisateurCible,
} from './declarer-disponibilite-activite.use-case';
import type { Activite } from '../../../domain/activite/entities/activite.entity';
import type { ActiviteRepository } from '../../../domain/activite/repositories/activite.repository.interface';
import type { DisponibiliteActivite } from '../../../domain/disponibilite/entities/disponibilite-activite.entity';
import type { DisponibiliteActiviteRepository } from '../../../domain/disponibilite/repositories/disponibilite-activite.repository.interface';
import type { Utilisateur } from '../../../domain/utilisateur/entities/utilisateur.entity';
import type { DeclarerDisponibiliteActiviteDto } from '../dto/declarer-disponibilite-activite.dto';

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

function makeActivite(overrides: Partial<Activite> = {}): Activite {
  return {
    id: 'activite-1',
    date: '2026-07-01',
    heureConvocation: '14:00',
    heureDebut: '15:00',
    label: 'Match amical',
    type: 'match',
    source: 'manuel',
    ...overrides,
  };
}

function makeDto(overrides: Partial<DeclarerDisponibiliteActiviteDto> = {}): DeclarerDisponibiliteActiviteDto {
  return { statut: 'absent', ...overrides } as DeclarerDisponibiliteActiviteDto;
}

function makeUseCase(options: {
  disponibilites?: Partial<DisponibiliteActiviteRepository>;
  activites?: Partial<ActiviteRepository>;
} = {}) {
  const disponibiliteRepository = {
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    save: jest.fn((entity: DisponibiliteActivite) => Promise.resolve(entity)),
    findByActiviteIds: jest.fn().mockResolvedValue([]),
    findByUtilisateurEtActivite: jest.fn().mockResolvedValue(null),
    deleteById: jest.fn(),
    ...options.disponibilites,
  } as unknown as DisponibiliteActiviteRepository;

  const activiteRepository = {
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(makeActivite()),
    save: jest.fn(),
    findUpcoming: jest.fn().mockResolvedValue([]),
    deleteById: jest.fn(),
    findByIdExterne: jest.fn().mockResolvedValue(null),
    ...options.activites,
  } as unknown as ActiviteRepository;

  return {
    useCase: new DeclarerDisponibiliteActiviteUseCase(disponibiliteRepository, activiteRepository),
    disponibiliteRepository,
    activiteRepository,
  };
}

describe('DeclarerDisponibiliteActiviteUseCase', () => {
  it("lève NotFoundException quand l'activité n'existe pas, sans appeler save", async () => {
    const { useCase, disponibiliteRepository } = makeUseCase({
      activites: { findById: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      useCase.execute('activite-inconnue', makeDto(), makeUtilisateur()),
    ).rejects.toThrow(NotFoundException);
    expect(disponibiliteRepository.save).not.toHaveBeenCalled();
  });

  it("crée une nouvelle surcharge (id généré) quand aucune n'existe encore pour l'utilisateur connecté", async () => {
    const utilisateur = makeUtilisateur({ id: 'joueur-1' });
    const { useCase, disponibiliteRepository } = makeUseCase();

    const result = await useCase.execute(
      'activite-1',
      makeDto({ statut: 'present', commentaire: 'Je viens' }),
      utilisateur,
    );

    expect(disponibiliteRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        utilisateurId: 'joueur-1',
        activiteId: 'activite-1',
        statut: 'present',
        commentaire: 'Je viens',
      }),
    );
    expect(result.id).toBeTruthy();
  });

  it('met à jour la surcharge existante (réutilise son id) plutôt que d\'en créer une nouvelle', async () => {
    const existante: DisponibiliteActivite = {
      id: 'dispo-existante',
      utilisateurId: 'joueur-1',
      activiteId: 'activite-1',
      statut: 'present',
      commentaire: 'Ancien commentaire',
    };
    const { useCase, disponibiliteRepository } = makeUseCase({
      disponibilites: { findByUtilisateurEtActivite: jest.fn().mockResolvedValue(existante) },
    });

    await useCase.execute('activite-1', makeDto({ statut: 'absent' }), makeUtilisateur({ id: 'joueur-1' }));

    expect(disponibiliteRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'dispo-existante', statut: 'absent' }),
    );
  });

  it("interroge findByUtilisateurEtActivite avec l'utilisateur connecté quand aucun utilisateurId n'est fourni dans le DTO", async () => {
    const { useCase, disponibiliteRepository } = makeUseCase();

    await useCase.execute('activite-1', makeDto(), makeUtilisateur({ id: 'joueur-1' }));

    expect(disponibiliteRepository.findByUtilisateurEtActivite).toHaveBeenCalledWith(
      'joueur-1',
      'activite-1',
    );
  });

  it("lève ForbiddenException quand un joueur tente de cibler un autre utilisateur, sans appeler save", async () => {
    const { useCase, disponibiliteRepository } = makeUseCase();
    const joueur = makeUtilisateur({ id: 'joueur-1', role: 'joueur' });

    await expect(
      useCase.execute('activite-1', makeDto({ utilisateurId: 'autre-joueur' }), joueur),
    ).rejects.toThrow(ForbiddenException);
    expect(disponibiliteRepository.save).not.toHaveBeenCalled();
  });

  it('autorise un admin à déclarer la disponibilité d\'un autre utilisateur', async () => {
    const { useCase, disponibiliteRepository } = makeUseCase();
    const admin = makeUtilisateur({ id: 'admin-1', role: 'admin' });

    await useCase.execute(
      'activite-1',
      makeDto({ statut: 'disponible', utilisateurId: 'joueur-cible' }),
      admin,
    );

    expect(disponibiliteRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ utilisateurId: 'joueur-cible', statut: 'disponible' }),
    );
  });

  it("autorise un joueur à fournir explicitement son propre id dans utilisateurId (no-op fonctionnel)", async () => {
    const { useCase, disponibiliteRepository } = makeUseCase();
    const joueur = makeUtilisateur({ id: 'joueur-1', role: 'joueur' });

    await useCase.execute('activite-1', makeDto({ utilisateurId: 'joueur-1' }), joueur);

    expect(disponibiliteRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ utilisateurId: 'joueur-1' }),
    );
  });
});

describe('resoudreUtilisateurCible', () => {
  it('renvoie l\'id du connecté quand aucun id demandé', () => {
    expect(resoudreUtilisateurCible(undefined, makeUtilisateur({ id: 'u1' }))).toBe('u1');
  });

  it('renvoie l\'id du connecté quand il est identique à celui demandé', () => {
    expect(resoudreUtilisateurCible('u1', makeUtilisateur({ id: 'u1' }))).toBe('u1');
  });

  it('lève ForbiddenException pour un non-admin ciblant un autre utilisateur', () => {
    expect(() =>
      resoudreUtilisateurCible('autre', makeUtilisateur({ id: 'u1', role: 'joueur' })),
    ).toThrow(ForbiddenException);
  });

  it('renvoie l\'id demandé pour un admin ciblant un autre utilisateur', () => {
    expect(resoudreUtilisateurCible('autre', makeUtilisateur({ id: 'u1', role: 'admin' }))).toBe(
      'autre',
    );
  });
});
