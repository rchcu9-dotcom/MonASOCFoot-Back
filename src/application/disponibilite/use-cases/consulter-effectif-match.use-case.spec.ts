import { ConsulterEffectifMatchUseCase } from './consulter-effectif-match.use-case';
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
    id: 'match-1',
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

  const useCase = new ConsulterEffectifMatchUseCase(
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

describe('ConsulterEffectifMatchUseCase', () => {
  describe('aucun match à venir', () => {
    it("renvoie une réponse vide quand findUpcoming ne renvoie aucune activité", async () => {
      const { useCase } = makeUseCase();

      const result = await useCase.execute({});

      expect(result).toEqual({
        matchCourant: null,
        matchPrecedentId: null,
        matchSuivantId: null,
        badge: null,
        matchsAVenir: [],
        joueurs: [],
      });
    });

    it('renvoie une réponse vide quand seules des activités de type "autre" sont à venir (aucun match)', async () => {
      const { useCase } = makeUseCase({
        activiteRepository: {
          findUpcoming: jest
            .fn()
            .mockResolvedValue([makeActivite({ id: 'ag-1', type: 'autre' })]),
        },
      });

      const result = await useCase.execute({});

      expect(result.matchCourant).toBeNull();
      expect(result.badge).toBeNull();
      expect(result.joueurs).toEqual([]);
    });
  });

  describe('sélection du match courant', () => {
    it('sélectionne par défaut le premier match à venir (le plus proche) quand aucun matchId n\'est fourni', async () => {
      const matchs = [
        makeActivite({ id: 'm1', date: '2026-07-01' }),
        makeActivite({ id: 'm2', date: '2026-07-08' }),
      ];
      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue(matchs) },
      });

      const result = await useCase.execute({});

      expect(result.matchCourant?.id).toBe('m1');
    });

    it('sélectionne le match demandé par matchId quand il fait partie des matchs à venir', async () => {
      const matchs = [
        makeActivite({ id: 'm1', date: '2026-07-01' }),
        makeActivite({ id: 'm2', date: '2026-07-08' }),
      ];
      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue(matchs) },
      });

      const result = await useCase.execute({ matchId: 'm2' });

      expect(result.matchCourant?.id).toBe('m2');
    });

    it("retombe sur le premier match à venir quand le matchId demandé est obsolète/introuvable", async () => {
      const matchs = [
        makeActivite({ id: 'm1', date: '2026-07-01' }),
        makeActivite({ id: 'm2', date: '2026-07-08' }),
      ];
      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue(matchs) },
      });

      const result = await useCase.execute({ matchId: 'match-supprime' });

      expect(result.matchCourant?.id).toBe('m1');
    });

    it('ignore les activités de type "autre" pour la sélection, même plus proches dans le calendrier', async () => {
      const activites = [
        makeActivite({ id: 'ag-1', date: '2026-06-25', type: 'autre' }),
        makeActivite({ id: 'm1', date: '2026-07-01', type: 'match' }),
      ];
      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue(activites) },
      });

      const result = await useCase.execute({});

      expect(result.matchCourant?.id).toBe('m1');
    });
  });

  describe('navigation précédent/suivant', () => {
    const matchs = [
      makeActivite({ id: 'm1', date: '2026-07-01' }),
      makeActivite({ id: 'm2', date: '2026-07-08' }),
      makeActivite({ id: 'm3', date: '2026-07-15' }),
    ];

    it('matchPrecedentId est null quand le match courant est le premier de la liste', async () => {
      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue(matchs) },
      });

      const result = await useCase.execute({ matchId: 'm1' });

      expect(result.matchPrecedentId).toBeNull();
      expect(result.matchSuivantId).toBe('m2');
    });

    it('matchSuivantId est null quand le match courant est le dernier de la liste', async () => {
      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue(matchs) },
      });

      const result = await useCase.execute({ matchId: 'm3' });

      expect(result.matchSuivantId).toBeNull();
      expect(result.matchPrecedentId).toBe('m2');
    });

    it('matchPrecedentId/matchSuivantId pointent vers les voisins directs pour un match au milieu de la liste', async () => {
      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue(matchs) },
      });

      const result = await useCase.execute({ matchId: 'm2' });

      expect(result.matchPrecedentId).toBe('m1');
      expect(result.matchSuivantId).toBe('m3');
    });
  });

  describe('matchsAVenir (liste complète pour la pop-up de sélection)', () => {
    it('renvoie tous les matchs à venir, dans l\'ordre renvoyé par findUpcoming', async () => {
      const matchs = [
        makeActivite({ id: 'm1', date: '2026-07-01' }),
        makeActivite({ id: 'm2', date: '2026-07-08' }),
        makeActivite({ id: 'm3', date: '2026-07-15' }),
      ];
      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue(matchs) },
      });

      const result = await useCase.execute({});

      expect(result.matchsAVenir.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
    });

    it('exclut les activités de type "autre" de la liste', async () => {
      const activites = [
        makeActivite({ id: 'ag-1', date: '2026-06-25', type: 'autre' }),
        makeActivite({ id: 'm1', date: '2026-07-01', type: 'match' }),
      ];
      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue(activites) },
      });

      const result = await useCase.execute({});

      expect(result.matchsAVenir.map((m) => m.id)).toEqual(['m1']);
    });

    it('reste identique quel que soit le match affiché (matchId) — indépendant de la navigation', async () => {
      const matchs = [
        makeActivite({ id: 'm1', date: '2026-07-01' }),
        makeActivite({ id: 'm2', date: '2026-07-08' }),
      ];
      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue(matchs) },
      });

      const resultatM1 = await useCase.execute({ matchId: 'm1' });
      const resultatM2 = await useCase.execute({ matchId: 'm2' });

      expect(resultatM1.matchsAVenir.map((m) => m.id)).toEqual(
        resultatM2.matchsAVenir.map((m) => m.id),
      );
    });

    it('mappe chaque match avec les mêmes champs que matchCourant (id, date, heures, label, type, équipe, commentaire)', async () => {
      const match = makeActivite({
        id: 'm1',
        date: '2026-07-01',
        heureConvocation: '13:00',
        heureDebut: '15:00',
        label: 'Match amical',
        type: 'match',
        equipe: 'A',
        commentaire: 'RDV au stade',
      });
      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue([match]) },
      });

      const result = await useCase.execute({});

      expect(result.matchsAVenir).toEqual([
        {
          id: 'm1',
          date: '2026-07-01',
          heureConvocation: '13:00',
          heureDebut: '15:00',
          label: 'Match amical',
          type: 'match',
          equipe: 'A',
          commentaire: 'RDV au stade',
        },
      ]);
    });

    it("est vide quand aucun match à venir n'existe", async () => {
      const { useCase } = makeUseCase();

      const result = await useCase.execute({});

      expect(result.matchsAVenir).toEqual([]);
    });
  });

  describe('badge de synthèse pour le match courant', () => {
    it('compte les présents et les disponibles parmi les joueurs pour le match courant uniquement', async () => {
      const match = makeActivite({ id: 'm1' });
      const utilisateurs = [
        makeUtilisateur({ id: 'u1' }),
        makeUtilisateur({ id: 'u2' }),
        makeUtilisateur({ id: 'u3' }),
      ];
      const surcharges: DisponibiliteActivite[] = [
        { id: 'd1', utilisateurId: 'u1', activiteId: 'm1', statut: 'present' },
        { id: 'd2', utilisateurId: 'u2', activiteId: 'm1', statut: 'disponible' },
        { id: 'd3', utilisateurId: 'u3', activiteId: 'm1', statut: 'absent' },
      ];

      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue([match]) },
        utilisateurRepository: { findAll: jest.fn().mockResolvedValue(utilisateurs) },
        disponibiliteActiviteRepository: {
          findByActiviteIds: jest.fn().mockResolvedValue(surcharges),
        },
      });

      const result = await useCase.execute({});

      expect(result.badge).toEqual({ nbPresents: 1, nbDisponibles: 1, pourcentageSaisie: 100 });
    });

    it("le pourcentage de saisie est le ratio de joueurs renseignés (source !== 'aucune') sur l'effectif total, arrondi", async () => {
      const match = makeActivite({ id: 'm1' });
      const utilisateurs = [
        makeUtilisateur({ id: 'u1' }),
        makeUtilisateur({ id: 'u2' }),
        makeUtilisateur({ id: 'u3' }),
      ];
      const surcharges: DisponibiliteActivite[] = [
        { id: 'd1', utilisateurId: 'u1', activiteId: 'm1', statut: 'present' },
      ];

      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue([match]) },
        utilisateurRepository: { findAll: jest.fn().mockResolvedValue(utilisateurs) },
        disponibiliteActiviteRepository: {
          findByActiviteIds: jest.fn().mockResolvedValue(surcharges),
        },
      });

      const result = await useCase.execute({});

      // 1/3 = 33.33...% -> arrondi à 33
      expect(result.badge?.pourcentageSaisie).toBe(33);
    });

    it("le pourcentage de saisie vaut 0 quand l'effectif est vide (pas de division par zéro)", async () => {
      const match = makeActivite({ id: 'm1' });

      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue([match]) },
        utilisateurRepository: { findAll: jest.fn().mockResolvedValue([]) },
      });

      const result = await useCase.execute({});

      expect(result.badge).toEqual({ nbPresents: 0, nbDisponibles: 0, pourcentageSaisie: 0 });
    });
  });

  describe('% de matchs à venir renseignés par joueur (global, indépendant du match affiché)', () => {
    it("vaut 0% quand le joueur n'a renseigné aucun des matchs à venir", async () => {
      const matchs = [makeActivite({ id: 'm1' }), makeActivite({ id: 'm2', date: '2026-07-08' })];
      const utilisateur = makeUtilisateur({ id: 'u1' });

      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue(matchs) },
        utilisateurRepository: { findAll: jest.fn().mockResolvedValue([utilisateur]) },
      });

      const result = await useCase.execute({});

      expect(result.joueurs[0].pourcentageMatchsAVenirRenseignes).toBe(0);
    });

    it('vaut 100% quand le joueur a renseigné tous les matchs à venir', async () => {
      const matchs = [makeActivite({ id: 'm1' }), makeActivite({ id: 'm2', date: '2026-07-08' })];
      const utilisateur = makeUtilisateur({ id: 'u1' });
      const surcharges: DisponibiliteActivite[] = [
        { id: 'd1', utilisateurId: 'u1', activiteId: 'm1', statut: 'present' },
        { id: 'd2', utilisateurId: 'u1', activiteId: 'm2', statut: 'absent' },
      ];

      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue(matchs) },
        utilisateurRepository: { findAll: jest.fn().mockResolvedValue([utilisateur]) },
        disponibiliteActiviteRepository: {
          findByActiviteIds: jest.fn().mockResolvedValue(surcharges),
        },
      });

      const result = await useCase.execute({});

      expect(result.joueurs[0].pourcentageMatchsAVenirRenseignes).toBe(100);
    });

    it('est arrondi (1 match renseigné sur 3)', async () => {
      const matchs = [
        makeActivite({ id: 'm1', date: '2026-07-01' }),
        makeActivite({ id: 'm2', date: '2026-07-08' }),
        makeActivite({ id: 'm3', date: '2026-07-15' }),
      ];
      const utilisateur = makeUtilisateur({ id: 'u1' });
      const surcharges: DisponibiliteActivite[] = [
        { id: 'd1', utilisateurId: 'u1', activiteId: 'm1', statut: 'present' },
      ];

      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue(matchs) },
        utilisateurRepository: { findAll: jest.fn().mockResolvedValue([utilisateur]) },
        disponibiliteActiviteRepository: {
          findByActiviteIds: jest.fn().mockResolvedValue(surcharges),
        },
      });

      const result = await useCase.execute({});

      expect(result.joueurs[0].pourcentageMatchsAVenirRenseignes).toBe(33);
    });

    it("reste identique quel que soit le match affiché (matchId) — indicateur global, pas dépendant de la navigation", async () => {
      const matchs = [
        makeActivite({ id: 'm1', date: '2026-07-01' }),
        makeActivite({ id: 'm2', date: '2026-07-08' }),
      ];
      const utilisateur = makeUtilisateur({ id: 'u1' });
      const surcharges: DisponibiliteActivite[] = [
        { id: 'd1', utilisateurId: 'u1', activiteId: 'm1', statut: 'present' },
      ];
      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue(matchs) },
        utilisateurRepository: { findAll: jest.fn().mockResolvedValue([utilisateur]) },
        disponibiliteActiviteRepository: {
          findByActiviteIds: jest.fn().mockResolvedValue(surcharges),
        },
      });

      const resultatM1 = await useCase.execute({ matchId: 'm1' });
      const resultatM2 = await useCase.execute({ matchId: 'm2' });

      expect(resultatM1.joueurs[0].pourcentageMatchsAVenirRenseignes).toBe(
        resultatM2.joueurs[0].pourcentageMatchsAVenirRenseignes,
      );
    });
  });

  describe('statut du joueur pour le match courant (disponibiliteMatchCourant)', () => {
    it('reflète la surcharge déclarée pour le match courant sélectionné, pas pour un autre match', async () => {
      const matchs = [
        makeActivite({ id: 'm1', date: '2026-07-01' }),
        makeActivite({ id: 'm2', date: '2026-07-08' }),
      ];
      const utilisateur = makeUtilisateur({ id: 'u1' });
      const surcharges: DisponibiliteActivite[] = [
        { id: 'd1', utilisateurId: 'u1', activiteId: 'm1', statut: 'present' },
        { id: 'd2', utilisateurId: 'u1', activiteId: 'm2', statut: 'absent' },
      ];
      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue(matchs) },
        utilisateurRepository: { findAll: jest.fn().mockResolvedValue([utilisateur]) },
        disponibiliteActiviteRepository: {
          findByActiviteIds: jest.fn().mockResolvedValue(surcharges),
        },
      });

      const resultatM1 = await useCase.execute({ matchId: 'm1' });
      const resultatM2 = await useCase.execute({ matchId: 'm2' });

      expect(resultatM1.joueurs[0].disponibiliteMatchCourant).toEqual({
        statut: 'present',
        commentaire: undefined,
        source: 'activite',
      });
      expect(resultatM2.joueurs[0].disponibiliteMatchCourant).toEqual({
        statut: 'absent',
        commentaire: undefined,
        source: 'activite',
      });
    });

    it("résout via la disponibilité de journée quand aucune surcharge d'activité n'existe pour le match", async () => {
      const match = makeActivite({ id: 'm1', date: '2026-07-01' });
      const utilisateur = makeUtilisateur({ id: 'u1' });
      const dispoJournee: DisponibiliteJournee = {
        id: 'dj-1',
        utilisateurId: 'u1',
        date: '2026-07-01',
        statut: 'disponible',
      };

      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue([match]) },
        utilisateurRepository: { findAll: jest.fn().mockResolvedValue([utilisateur]) },
        disponibiliteJourneeRepository: {
          findByDates: jest.fn().mockResolvedValue([dispoJournee]),
        },
      });

      const result = await useCase.execute({});

      expect(result.joueurs[0].disponibiliteMatchCourant).toEqual({
        statut: 'disponible',
        commentaire: undefined,
        source: 'journee',
      });
    });

    it("n'associe pas par erreur la disponibilité d'un autre joueur (isolation par utilisateur)", async () => {
      const match = makeActivite({ id: 'm1' });
      const utilisateurs = [makeUtilisateur({ id: 'u1' }), makeUtilisateur({ id: 'u2' })];
      const surchargeAutreJoueur: DisponibiliteActivite = {
        id: 'd1',
        utilisateurId: 'u2',
        activiteId: 'm1',
        statut: 'present',
      };

      const { useCase } = makeUseCase({
        activiteRepository: { findUpcoming: jest.fn().mockResolvedValue([match]) },
        utilisateurRepository: { findAll: jest.fn().mockResolvedValue(utilisateurs) },
        disponibiliteActiviteRepository: {
          findByActiviteIds: jest.fn().mockResolvedValue([surchargeAutreJoueur]),
        },
      });

      const result = await useCase.execute({});

      const ligneU1 = result.joueurs.find((j) => j.utilisateurId === 'u1');
      expect(ligneU1?.disponibiliteMatchCourant.source).toBe('aucune');
    });
  });

  describe('appels repositories', () => {
    it('interroge findUpcoming avec la date du jour (ISO yyyy-mm-dd)', async () => {
      const { useCase, activiteRepository } = makeUseCase();

      await useCase.execute({});

      const aujourdHui = new Date().toISOString().slice(0, 10);
      expect(activiteRepository.findUpcoming).toHaveBeenCalledWith(aujourdHui);
    });

    it("interroge findByDates/findByActiviteIds uniquement avec les dates/ids des matchs, pas des autres activités", async () => {
      const activites = [
        makeActivite({ id: 'm1', date: '2026-07-01', type: 'match' }),
        makeActivite({ id: 'ag-1', date: '2026-07-05', type: 'autre' }),
      ];
      const { useCase, disponibiliteJourneeRepository, disponibiliteActiviteRepository } =
        makeUseCase({
          activiteRepository: { findUpcoming: jest.fn().mockResolvedValue(activites) },
        });

      await useCase.execute({});

      expect(disponibiliteJourneeRepository.findByDates).toHaveBeenCalledWith(['2026-07-01']);
      expect(disponibiliteActiviteRepository.findByActiviteIds).toHaveBeenCalledWith(['m1']);
    });
  });
});
