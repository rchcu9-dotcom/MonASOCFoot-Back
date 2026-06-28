import { ListerMesDisponibilitesJourneeUseCase } from './lister-mes-disponibilites-journee.use-case';
import type { DisponibiliteJournee } from '../../../domain/disponibilite/entities/disponibilite-journee.entity';
import type { DisponibiliteJourneeRepository } from '../../../domain/disponibilite/repositories/disponibilite-journee.repository.interface';
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

function makeDisponibilite(overrides: Partial<DisponibiliteJournee> = {}): DisponibiliteJournee {
  return {
    id: 'dispo-1',
    utilisateurId: 'joueur-1',
    date: '2026-07-01',
    statut: 'present',
    ...overrides,
  };
}

function makeUseCase(options: { disponibilites?: Partial<DisponibiliteJourneeRepository> } = {}) {
  const disponibiliteRepository = {
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    save: jest.fn(),
    findByDates: jest.fn().mockResolvedValue([]),
    findByUtilisateurEtDate: jest.fn().mockResolvedValue(null),
    findByUtilisateurId: jest.fn().mockResolvedValue([]),
    ...options.disponibilites,
  } as unknown as DisponibiliteJourneeRepository;

  return {
    useCase: new ListerMesDisponibilitesJourneeUseCase(disponibiliteRepository),
    disponibiliteRepository,
  };
}

describe('ListerMesDisponibilitesJourneeUseCase', () => {
  it("appelle findByUtilisateurId avec l'id de l'utilisateur connecté", async () => {
    const { useCase, disponibiliteRepository } = makeUseCase();
    const utilisateur = makeUtilisateur({ id: 'joueur-42' });

    await useCase.execute(utilisateur);

    expect(disponibiliteRepository.findByUtilisateurId).toHaveBeenCalledWith('joueur-42');
  });

  it('renvoie directement les disponibilités retournées par le repository', async () => {
    const disponibilites = [
      makeDisponibilite({ id: 'd1', date: '2026-07-01' }),
      makeDisponibilite({ id: 'd2', date: '2026-07-08' }),
    ];
    const { useCase } = makeUseCase({
      disponibilites: { findByUtilisateurId: jest.fn().mockResolvedValue(disponibilites) },
    });

    const result = await useCase.execute(makeUtilisateur());

    expect(result).toEqual(disponibilites);
  });

  it("renvoie un tableau vide quand l'utilisateur connecté n'a aucune disponibilité de journée déclarée", async () => {
    const { useCase } = makeUseCase({
      disponibilites: { findByUtilisateurId: jest.fn().mockResolvedValue([]) },
    });

    const result = await useCase.execute(makeUtilisateur());

    expect(result).toEqual([]);
  });

  it("ne tient pas compte d'un éventuel rôle admin : retourne toujours les dispos de l'utilisateur connecté lui-même, jamais celles d'un autre", async () => {
    const { useCase, disponibiliteRepository } = makeUseCase();
    const admin = makeUtilisateur({ id: 'admin-1', role: 'admin' });

    await useCase.execute(admin);

    expect(disponibiliteRepository.findByUtilisateurId).toHaveBeenCalledWith('admin-1');
    expect(disponibiliteRepository.findByUtilisateurId).not.toHaveBeenCalledWith(
      expect.not.stringMatching('admin-1'),
    );
  });
});
