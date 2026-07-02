import { ConsulterDisponibilitesEffectifUseCase } from './consulter-disponibilites-effectif.use-case';
import type { Activite } from '../../../domain/activite/entities/activite.entity';
import type { ActiviteRepository } from '../../../domain/activite/repositories/activite.repository.interface';
import type { DisponibiliteActivite } from '../../../domain/disponibilite/entities/disponibilite-activite.entity';
import type { DisponibiliteJournee } from '../../../domain/disponibilite/entities/disponibilite-journee.entity';
import type { DisponibiliteActiviteRepository } from '../../../domain/disponibilite/repositories/disponibilite-activite.repository.interface';
import type { DisponibiliteJourneeRepository } from '../../../domain/disponibilite/repositories/disponibilite-journee.repository.interface';
import type { Utilisateur } from '../../../domain/utilisateur/entities/utilisateur.entity';
import type { UtilisateurRepository } from '../../../domain/utilisateur/repositories/utilisateur.repository.interface';

function makeActivite(overrides: Partial<Activite> = {}): Activite {
  return {
    id: 'activite-1',
    date: '2026-07-01',
    heureConvocation: '14:00',
    heureDebut: '15:00',
    label: 'Match amical',
    type: 'match',
    ...overrides,
  };
}

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

function makeUseCase(overrides: {
  activiteRepository?: Partial<ActiviteRepository>;
  utilisateurRepository?: Partial<UtilisateurRepository>;
  disponibiliteJourneeRepository?: Partial<DisponibiliteJourneeRepository>;
  disponibiliteActiviteRepository?: Partial<DisponibiliteActiviteRepository>;
} = {}) {
  const activiteRepository = {
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    save: jest.fn(),
    findUpcoming: jest.fn().mockResolvedValue([]),
    findDernierePassee: jest.fn().mockResolvedValue(null),
    ...overrides.activiteRepository,
  } as unknown as ActiviteRepository;

  const utilisateurRepository = {
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    save: jest.fn(),
    ...overrides.utilisateurRepository,
  } as unknown as UtilisateurRepository;

  const disponibiliteJourneeRepository = {
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    save: jest.fn(),
    findByDates: jest.fn().mockResolvedValue([]),
    ...overrides.disponibiliteJourneeRepository,
  } as unknown as DisponibiliteJourneeRepository;

  const disponibiliteActiviteRepository = {
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    save: jest.fn(),
    findByActiviteIds: jest.fn().mockResolvedValue([]),
    ...overrides.disponibiliteActiviteRepository,
  } as unknown as DisponibiliteActiviteRepository;

  const useCase = new ConsulterDisponibilitesEffectifUseCase(
    activiteRepository,
    utilisateurRepository,
    disponibiliteJourneeRepository,
    disponibiliteActiviteRepository,
  );

  return {
    useCase,
    activiteRepository,
    utilisateurRepository,
    disponibiliteJourneeRepository,
    disponibiliteActiviteRepository,
  };
}

describe('ConsulterDisponibilitesEffectifUseCase', () => {
  describe('résolution des activités (sans filtre, par activiteId, par date)', () => {
    it("sans filtre, renvoie toutes les activités à venir depuis aujourd'hui (ISO yyyy-mm-dd)", async () => {
      const activites = [makeActivite({ id: 'a1' })];
      const { useCase, activiteRepository } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue(activites) },
      });

      const result = await useCase.execute({});

      const aujourdHui = new Date().toISOString().slice(0, 10);
      expect(activiteRepository.findUpcoming).toHaveBeenCalledWith(aujourdHui);
      expect(result.activites.map((a) => a.id)).toEqual(['a1']);
    });

    it('avec activiteId, ne renvoie que cette activité (findById)', async () => {
      const activite = makeActivite({ id: 'cible' });
      const { useCase, activiteRepository } = makeUseCase({
        activiteRepository: { findById: jest.fn().mockResolvedValue(activite) },
      });

      const result = await useCase.execute({ activiteId: 'cible' });

      expect(activiteRepository.findById).toHaveBeenCalledWith('cible');
      expect(result.activites.map((a) => a.id)).toEqual(['cible']);
    });

    it("avec activiteId introuvable, renvoie une liste d'activités vide", async () => {
      const { useCase } = makeUseCase({
        activiteRepository: { findById: jest.fn().mockResolvedValue(null) },
      });

      const result = await useCase.execute({ activiteId: 'inconnue' });

      expect(result.activites).toEqual([]);
    });

    it('avec date, ne renvoie que les activités correspondant à cette date exacte', async () => {
      const activites = [
        makeActivite({ id: 'a1', date: '2026-07-01' }),
        makeActivite({ id: 'a2', date: '2026-07-08' }),
      ];
      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue(activites) },
      });

      const result = await useCase.execute({ date: '2026-07-01' });

      expect(result.activites.map((a) => a.id)).toEqual(['a1']);
    });

    it("exclut une activité sans date renvoyée par erreur par resoudreActivites (garde défensive)", async () => {
      const activiteAvecDate = makeActivite({ id: 'avec-date', date: '2026-07-01' });
      const activiteSansDate = makeActivite({ id: 'sans-date', date: undefined });
      const { useCase } = makeUseCase({
        activiteRepository: {
          findById: jest.fn().mockResolvedValue(activiteSansDate),
        },
      });
      // Cas limite documenté dans le code : `activiteId` peut cibler une activité non planifiée.
      const result = await useCase.execute({ activiteId: 'sans-date' });
      expect(result.activites).toEqual([]);

      const { useCase: useCase2 } = makeUseCase({
        activiteRepository: {
          findUpcoming: jest.fn().mockResolvedValue([activiteAvecDate]),
        },
      });
      const result2 = await useCase2.execute({});
      expect(result2.activites.map((a) => a.id)).toEqual(['avec-date']);
    });
  });

  describe('grille joueurs x activités', () => {
    it('renvoie une ligne par utilisateur, avec une entrée de disponibilité par activité', async () => {
      const activites = [makeActivite({ id: 'a1' }), makeActivite({ id: 'a2', date: '2026-07-08' })];
      const utilisateurs = [makeUtilisateur({ id: 'u1' }), makeUtilisateur({ id: 'u2' })];
      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue(activites) },
        utilisateurRepository: { findAll: jest.fn().mockResolvedValue(utilisateurs) },
      });

      const result = await useCase.execute({});

      expect(result.joueurs).toHaveLength(2);
      expect(Object.keys(result.joueurs[0].disponibilites).sort()).toEqual(['a1', 'a2']);
    });

    it("résout le statut 'pas renseigné' (source aucune) pour une activité sans déclaration", async () => {
      const activite = makeActivite({ id: 'a1' });
      const utilisateur = makeUtilisateur();
      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue([activite]) },
        utilisateurRepository: { findAll: jest.fn().mockResolvedValue([utilisateur]) },
      });

      const result = await useCase.execute({});

      expect(result.joueurs[0].disponibilites.a1).toEqual({ statut: 'autre', source: 'aucune' });
    });

    it('la surcharge de disponibilité activité prime sur la disponibilité de journée', async () => {
      const activite = makeActivite({ id: 'a1', date: '2026-07-01' });
      const utilisateur = makeUtilisateur({ id: 'u1' });
      const surcharge: DisponibiliteActivite = {
        id: 'da-1',
        utilisateurId: 'u1',
        activiteId: 'a1',
        statut: 'present',
      };
      const dispoJournee: DisponibiliteJournee = {
        id: 'dj-1',
        utilisateurId: 'u1',
        date: '2026-07-01',
        statut: 'absent',
      };

      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue([activite]) },
        utilisateurRepository: { findAll: jest.fn().mockResolvedValue([utilisateur]) },
        disponibiliteActiviteRepository: {
          findByActiviteIds: jest.fn().mockResolvedValue([surcharge]),
        },
        disponibiliteJourneeRepository: {
          findByDates: jest.fn().mockResolvedValue([dispoJournee]),
        },
      });

      const result = await useCase.execute({});

      expect(result.joueurs[0].disponibilites.a1).toEqual({
        statut: 'present',
        commentaire: undefined,
        source: 'activite',
      });
    });

    it("n'associe pas par erreur la disponibilité d'un autre utilisateur (isolation par utilisateur)", async () => {
      const activite = makeActivite({ id: 'a1' });
      const utilisateurs = [makeUtilisateur({ id: 'u1' }), makeUtilisateur({ id: 'u2' })];
      const surchargeAutreUtilisateur: DisponibiliteActivite = {
        id: 'da-1',
        utilisateurId: 'u2',
        activiteId: 'a1',
        statut: 'present',
      };

      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue([activite]) },
        utilisateurRepository: { findAll: jest.fn().mockResolvedValue(utilisateurs) },
        disponibiliteActiviteRepository: {
          findByActiviteIds: jest.fn().mockResolvedValue([surchargeAutreUtilisateur]),
        },
      });

      const result = await useCase.execute({});

      const ligneU1 = result.joueurs.find((j) => j.utilisateurId === 'u1');
      expect(ligneU1?.disponibilites.a1.source).toBe('aucune');
    });

    it("renvoie une grille vide (aucune ligne joueur) quand il n'y a aucun utilisateur", async () => {
      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue([makeActivite()]) },
      });

      const result = await useCase.execute({});

      expect(result.joueurs).toEqual([]);
    });
  });

  describe('appels repositories', () => {
    it('interroge findByDates/findByActiviteIds avec les dates et ids des activités résolues', async () => {
      const activites = [
        makeActivite({ id: 'a1', date: '2026-07-01' }),
        makeActivite({ id: 'a2', date: '2026-07-08' }),
      ];
      const { useCase, disponibiliteJourneeRepository, disponibiliteActiviteRepository } =
        makeUseCase({
          activiteRepository: { findUpcoming: jest.fn().mockResolvedValue(activites) },
        });

      await useCase.execute({});

      expect(disponibiliteJourneeRepository.findByDates).toHaveBeenCalledWith([
        '2026-07-01',
        '2026-07-08',
      ]);
      expect(disponibiliteActiviteRepository.findByActiviteIds).toHaveBeenCalledWith([
        'a1',
        'a2',
      ]);
    });
  });
});
