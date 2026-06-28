import { ForbiddenException } from '@nestjs/common';
import { DeclarerDisponibiliteJourneeUseCase } from './declarer-disponibilite-journee.use-case';
import type { DisponibiliteJournee } from '../../../domain/disponibilite/entities/disponibilite-journee.entity';
import type { DisponibiliteJourneeRepository } from '../../../domain/disponibilite/repositories/disponibilite-journee.repository.interface';
import type { Utilisateur } from '../../../domain/utilisateur/entities/utilisateur.entity';
import type { DeclarerDisponibiliteJourneeDto } from '../dto/declarer-disponibilite-journee.dto';

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

function makeDto(
  overrides: Partial<DeclarerDisponibiliteJourneeDto> = {},
): DeclarerDisponibiliteJourneeDto {
  return { statut: 'absent', ...overrides } as DeclarerDisponibiliteJourneeDto;
}

function makeUseCase(options: { disponibilites?: Partial<DisponibiliteJourneeRepository> } = {}) {
  const disponibiliteRepository = {
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    save: jest.fn((entity: DisponibiliteJournee) => Promise.resolve(entity)),
    findByDates: jest.fn().mockResolvedValue([]),
    findByUtilisateurEtDate: jest.fn().mockResolvedValue(null),
    findByUtilisateurId: jest.fn().mockResolvedValue([]),
    ...options.disponibilites,
  } as unknown as DisponibiliteJourneeRepository;

  return {
    useCase: new DeclarerDisponibiliteJourneeUseCase(disponibiliteRepository),
    disponibiliteRepository,
  };
}

describe('DeclarerDisponibiliteJourneeUseCase', () => {
  it("crée une nouvelle disponibilité de journée (id généré) quand aucune n'existe encore pour l'utilisateur connecté et cette date", async () => {
    const utilisateur = makeUtilisateur({ id: 'joueur-1' });
    const { useCase, disponibiliteRepository } = makeUseCase();

    const result = await useCase.execute(
      '2026-07-01',
      makeDto({ statut: 'present', commentaire: 'Je viens' }),
      utilisateur,
    );

    expect(disponibiliteRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        utilisateurId: 'joueur-1',
        date: '2026-07-01',
        statut: 'present',
        commentaire: 'Je viens',
      }),
    );
    expect(result.id).toBeTruthy();
  });

  it('met à jour la disponibilité existante (réutilise son id) plutôt que d\'en créer une nouvelle, pour une ressaisie sur la même date', async () => {
    const existante: DisponibiliteJournee = {
      id: 'dispo-journee-existante',
      utilisateurId: 'joueur-1',
      date: '2026-07-01',
      statut: 'present',
      commentaire: 'Ancien commentaire',
    };
    const { useCase, disponibiliteRepository } = makeUseCase({
      disponibilites: { findByUtilisateurEtDate: jest.fn().mockResolvedValue(existante) },
    });

    await useCase.execute(
      '2026-07-01',
      makeDto({ statut: 'absent' }),
      makeUtilisateur({ id: 'joueur-1' }),
    );

    expect(disponibiliteRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'dispo-journee-existante', statut: 'absent' }),
    );
    // Une seule ligne en base : l'id de la ligne existante est réutilisé, pas de doublon créé.
    expect(disponibiliteRepository.save).toHaveBeenCalledTimes(1);
  });

  it('conserve le commentaire optionnel transmis dans le DTO', async () => {
    const { useCase, disponibiliteRepository } = makeUseCase();

    await useCase.execute(
      '2026-07-01',
      makeDto({ statut: 'disponible', commentaire: 'Dispo après 18h' }),
      makeUtilisateur(),
    );

    expect(disponibiliteRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ commentaire: 'Dispo après 18h' }),
    );
  });

  it('enregistre un commentaire undefined quand aucun commentaire n\'est fourni (optionnel)', async () => {
    const { useCase, disponibiliteRepository } = makeUseCase();

    await useCase.execute('2026-07-01', makeDto({ commentaire: undefined }), makeUtilisateur());

    expect(disponibiliteRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ commentaire: undefined }),
    );
  });

  it("interroge findByUtilisateurEtDate avec l'utilisateur connecté et la date demandée quand aucun utilisateurId n'est fourni dans le DTO", async () => {
    const { useCase, disponibiliteRepository } = makeUseCase();

    await useCase.execute('2026-07-01', makeDto(), makeUtilisateur({ id: 'joueur-1' }));

    expect(disponibiliteRepository.findByUtilisateurEtDate).toHaveBeenCalledWith(
      'joueur-1',
      '2026-07-01',
    );
  });

  it("lève ForbiddenException quand un joueur tente de cibler un autre utilisateur, sans appeler save", async () => {
    const { useCase, disponibiliteRepository } = makeUseCase();
    const joueur = makeUtilisateur({ id: 'joueur-1', role: 'joueur' });

    await expect(
      useCase.execute('2026-07-01', makeDto({ utilisateurId: 'autre-joueur' }), joueur),
    ).rejects.toThrow(ForbiddenException);
    expect(disponibiliteRepository.save).not.toHaveBeenCalled();
  });

  it("autorise un admin à déclarer la disponibilité de journée d'un autre utilisateur", async () => {
    const { useCase, disponibiliteRepository } = makeUseCase();
    const admin = makeUtilisateur({ id: 'admin-1', role: 'admin' });

    await useCase.execute(
      '2026-07-01',
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

    await useCase.execute('2026-07-01', makeDto({ utilisateurId: 'joueur-1' }), joueur);

    expect(disponibiliteRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ utilisateurId: 'joueur-1' }),
    );
  });

  it("recherche la disponibilité existante avec l'utilisateur cible résolu (admin ciblant un autre utilisateur), pas l'utilisateur connecté", async () => {
    const { useCase, disponibiliteRepository } = makeUseCase();
    const admin = makeUtilisateur({ id: 'admin-1', role: 'admin' });

    await useCase.execute(
      '2026-07-01',
      makeDto({ utilisateurId: 'joueur-cible' }),
      admin,
    );

    expect(disponibiliteRepository.findByUtilisateurEtDate).toHaveBeenCalledWith(
      'joueur-cible',
      '2026-07-01',
    );
  });
});
