import { ConsulterResumeAccueilUseCase } from './consulter-resume-accueil.use-case';
import type { Activite } from '../../../domain/activite/entities/activite.entity';
import type { ActiviteRepository } from '../../../domain/activite/repositories/activite.repository.interface';
import type { DisponibiliteActivite } from '../../../domain/disponibilite/entities/disponibilite-activite.entity';
import type { DisponibiliteJournee } from '../../../domain/disponibilite/entities/disponibilite-journee.entity';
import type { DisponibiliteActiviteRepository } from '../../../domain/disponibilite/repositories/disponibilite-activite.repository.interface';
import type { DisponibiliteJourneeRepository } from '../../../domain/disponibilite/repositories/disponibilite-journee.repository.interface';
import type { Utilisateur } from '../../../domain/utilisateur/entities/utilisateur.entity';

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

  const useCase = new ConsulterResumeAccueilUseCase(
    activiteRepository,
    disponibiliteJourneeRepository,
    disponibiliteActiviteRepository,
  );

  return { useCase, activiteRepository, disponibiliteJourneeRepository, disponibiliteActiviteRepository };
}

describe('ConsulterResumeAccueilUseCase', () => {
  describe('dernière activité passée', () => {
    it('renvoie dernierePassee à null quand findDernierePassee ne renvoie aucune activité', async () => {
      const { useCase } = makeUseCase();

      const result = await useCase.execute(makeUtilisateur());

      expect(result.dernierePassee).toBeNull();
    });

    it('résout la disponibilité effective du joueur connecté pour sa dernière activité passée (surcharge prioritaire)', async () => {
      const utilisateur = makeUtilisateur();
      const dernierePassee = makeActivite({ id: 'passee-1', date: '2026-06-20' });
      const surcharge: DisponibiliteActivite = {
        id: 'da-1',
        utilisateurId: utilisateur.id,
        activiteId: 'passee-1',
        statut: 'present',
        commentaire: 'Présent',
      };

      const { useCase } = makeUseCase({
        activiteRepository: {
          findDernierePassee: jest.fn().mockResolvedValue(dernierePassee),
        },
        disponibiliteActiviteRepository: {
          findByActiviteIds: jest.fn().mockResolvedValue([surcharge]),
        },
      });

      const result = await useCase.execute(utilisateur);

      expect(result.dernierePassee).toEqual({
        activite: expect.objectContaining({ id: 'passee-1', date: '2026-06-20' }),
        disponibilite: { statut: 'present', commentaire: 'Présent', source: 'activite' },
      });
    });

    it("retombe sur la dispo neutre quand aucune disponibilité n'est déclarée pour la dernière activité passée", async () => {
      const utilisateur = makeUtilisateur();
      const dernierePassee = makeActivite({ id: 'passee-1', date: '2026-06-20' });

      const { useCase } = makeUseCase({
        activiteRepository: {
          findDernierePassee: jest.fn().mockResolvedValue(dernierePassee),
        },
      });

      const result = await useCase.execute(utilisateur);

      expect(result.dernierePassee?.disponibilite).toEqual({ statut: 'autre', source: 'aucune' });
    });

    it("n'associe pas par erreur la disponibilité d'un autre utilisateur à la dernière activité passée", async () => {
      const utilisateur = makeUtilisateur({ id: 'user-cible' });
      const dernierePassee = makeActivite({ id: 'passee-1', date: '2026-06-20' });
      const surchargeAutreUtilisateur: DisponibiliteActivite = {
        id: 'da-1',
        utilisateurId: 'autre-utilisateur',
        activiteId: 'passee-1',
        statut: 'present',
      };

      const { useCase } = makeUseCase({
        activiteRepository: {
          findDernierePassee: jest.fn().mockResolvedValue(dernierePassee),
        },
        disponibiliteActiviteRepository: {
          findByActiviteIds: jest.fn().mockResolvedValue([surchargeAutreUtilisateur]),
        },
      });

      const result = await useCase.execute(utilisateur);

      expect(result.dernierePassee?.disponibilite.source).toBe('aucune');
    });
  });

  describe('3 prochaines dates', () => {
    it('regroupe les activités à venir par date distincte, dans la limite des 3 premières dates', async () => {
      const utilisateur = makeUtilisateur();
      const activites = [
        makeActivite({ id: 'a1', date: '2026-07-01', label: 'Entraînement' }),
        makeActivite({ id: 'a2', date: '2026-07-01', label: 'Match' }),
        makeActivite({ id: 'a3', date: '2026-07-08' }),
        makeActivite({ id: 'a4', date: '2026-07-15' }),
        makeActivite({ id: 'a5', date: '2026-07-22' }),
      ];

      const { useCase } = makeUseCase({
        activiteRepository: {
          findUpcoming: jest.fn().mockResolvedValue(activites),
        },
      });

      const result = await useCase.execute(utilisateur);

      expect(result.prochainesDates.map((p) => p.date)).toEqual([
        '2026-07-01',
        '2026-07-08',
        '2026-07-15',
      ]);
      expect(result.prochainesDates[0].activites.map((l) => l.activite.id)).toEqual(['a1', 'a2']);
    });

    it("n'affiche que les dates existantes quand il y a moins de 3 dates futures (pas de remplissage)", async () => {
      const activites = [makeActivite({ id: 'a1', date: '2026-07-01' })];

      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue(activites) },
      });

      const result = await useCase.execute(makeUtilisateur());

      expect(result.prochainesDates).toHaveLength(1);
    });

    it('renvoie un tableau vide quand aucune activité à venir n\'existe', async () => {
      const { useCase } = makeUseCase();

      const result = await useCase.execute(makeUtilisateur());

      expect(result.prochainesDates).toEqual([]);
    });

    it('résout le statut "pas renseigné" (source aucune) pour une activité à venir sans déclaration', async () => {
      const activite = makeActivite({ id: 'a1', date: '2026-07-01' });
      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue([activite]) },
      });

      const result = await useCase.execute(makeUtilisateur());

      expect(result.prochainesDates[0].activites[0].disponibilite).toEqual({
        statut: 'autre',
        source: 'aucune',
      });
    });

    it('résout le statut via la dispo de journée quand aucune surcharge d\'activité n\'existe', async () => {
      const utilisateur = makeUtilisateur();
      const activite = makeActivite({ id: 'a1', date: '2026-07-01' });
      const dispoJournee: DisponibiliteJournee = {
        id: 'dj-1',
        utilisateurId: utilisateur.id,
        date: '2026-07-01',
        statut: 'disponible',
      };

      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue([activite]) },
        disponibiliteJourneeRepository: {
          findByDates: jest.fn().mockResolvedValue([dispoJournee]),
        },
      });

      const result = await useCase.execute(utilisateur);

      expect(result.prochainesDates[0].activites[0].disponibilite).toEqual({
        statut: 'disponible',
        commentaire: undefined,
        source: 'journee',
      });
    });

    it("exclut une activité sans date renvoyée par findUpcoming (garde défensive)", async () => {
      const activiteAvecDate = makeActivite({ id: 'avec-date', date: '2026-07-01' });
      const activiteSansDate = makeActivite({ id: 'sans-date', date: undefined });

      const { useCase } = makeUseCase({
        activiteRepository: {
          findUpcoming: jest.fn().mockResolvedValue([activiteAvecDate, activiteSansDate]),
        },
      });

      const result = await useCase.execute(makeUtilisateur());

      const idsAffiches = result.prochainesDates.flatMap((p) => p.activites.map((l) => l.activite.id));
      expect(idsAffiches).toEqual(['avec-date']);
    });
  });

  describe('isolation par utilisateur', () => {
    it("filtre les dispos de journée/activité d'autres utilisateurs renvoyées par les repositories", async () => {
      const utilisateur = makeUtilisateur({ id: 'user-cible' });
      const activite = makeActivite({ id: 'a1', date: '2026-07-01' });
      const dispoJourneeAutreUtilisateur: DisponibiliteJournee = {
        id: 'dj-1',
        utilisateurId: 'autre-utilisateur',
        date: '2026-07-01',
        statut: 'present',
      };

      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue([activite]) },
        disponibiliteJourneeRepository: {
          findByDates: jest.fn().mockResolvedValue([dispoJourneeAutreUtilisateur]),
        },
      });

      const result = await useCase.execute(utilisateur);

      expect(result.prochainesDates[0].activites[0].disponibilite.source).toBe('aucune');
    });
  });

  describe('tableau de bord (sur les activités à venir uniquement)', () => {
    it('totalAVenir compte toutes les activités à venir, pas seulement celles des 3 premières dates', async () => {
      const activites = [
        makeActivite({ id: 'a1', date: '2026-07-01' }),
        makeActivite({ id: 'a2', date: '2026-07-08' }),
        makeActivite({ id: 'a3', date: '2026-07-15' }),
        makeActivite({ id: 'a4', date: '2026-07-22' }),
      ];

      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue(activites) },
      });

      const result = await useCase.execute(makeUtilisateur());

      expect(result.tableauDeBord.totalAVenir).toBe(4);
    });

    it('renseigneesAVenir compte les activités à venir dont la source résolue n\'est pas "aucune"', async () => {
      const utilisateur = makeUtilisateur();
      const activiteRenseignee = makeActivite({ id: 'a1', date: '2026-07-01' });
      const activiteNonRenseignee = makeActivite({ id: 'a2', date: '2026-07-08' });
      const surcharge: DisponibiliteActivite = {
        id: 'da-1',
        utilisateurId: utilisateur.id,
        activiteId: 'a1',
        statut: 'present',
      };

      const { useCase } = makeUseCase({
        activiteRepository: {
          findUpcoming: jest.fn().mockResolvedValue([activiteRenseignee, activiteNonRenseignee]),
        },
        disponibiliteActiviteRepository: {
          findByActiviteIds: jest.fn().mockResolvedValue([surcharge]),
        },
      });

      const result = await useCase.execute(utilisateur);

      expect(result.tableauDeBord.renseigneesAVenir).toBe(1);
    });

    it('pourcentageRenseignement est arrondi', async () => {
      const utilisateur = makeUtilisateur();
      const activites = [
        makeActivite({ id: 'a1', date: '2026-07-01' }),
        makeActivite({ id: 'a2', date: '2026-07-08' }),
        makeActivite({ id: 'a3', date: '2026-07-15' }),
      ];
      const surcharge: DisponibiliteActivite = {
        id: 'da-1',
        utilisateurId: utilisateur.id,
        activiteId: 'a1',
        statut: 'present',
      };

      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue(activites) },
        disponibiliteActiviteRepository: {
          findByActiviteIds: jest.fn().mockResolvedValue([surcharge]),
        },
      });

      const result = await useCase.execute(utilisateur);

      // 1/3 = 33.33...% -> arrondi à 33
      expect(result.tableauDeBord.pourcentageRenseignement).toBe(33);
    });

    it('pourcentageRenseignement vaut 0 quand totalAVenir est nul (pas de division par zéro)', async () => {
      const { useCase } = makeUseCase();

      const result = await useCase.execute(makeUtilisateur());

      expect(result.tableauDeBord).toEqual({
        totalAVenir: 0,
        renseigneesAVenir: 0,
        pourcentageRenseignement: 0,
      });
    });
  });

  describe('appels repositories', () => {
    it('interroge findDernierePassee et findUpcoming avec la date du jour (ISO yyyy-mm-dd)', async () => {
      const { useCase, activiteRepository } = makeUseCase();

      await useCase.execute(makeUtilisateur());

      const aujourdHui = new Date().toISOString().slice(0, 10);
      expect(activiteRepository.findDernierePassee).toHaveBeenCalledWith(aujourdHui);
      expect(activiteRepository.findUpcoming).toHaveBeenCalledWith(aujourdHui);
    });

    it('interroge findByDates/findByActiviteIds avec les dates et ids de la dernière passée ET des activités à venir réunies', async () => {
      const dernierePassee = makeActivite({ id: 'passee-1', date: '2026-06-20' });
      const aVenir = makeActivite({ id: 'avenir-1', date: '2026-07-01' });

      const { useCase, disponibiliteJourneeRepository, disponibiliteActiviteRepository } = makeUseCase({
        activiteRepository: {
          findDernierePassee: jest.fn().mockResolvedValue(dernierePassee),
          findUpcoming: jest.fn().mockResolvedValue([aVenir]),
        },
      });

      await useCase.execute(makeUtilisateur());

      expect(disponibiliteJourneeRepository.findByDates).toHaveBeenCalledWith([
        '2026-06-20',
        '2026-07-01',
      ]);
      expect(disponibiliteActiviteRepository.findByActiviteIds).toHaveBeenCalledWith([
        'passee-1',
        'avenir-1',
      ]);
    });
  });
});
