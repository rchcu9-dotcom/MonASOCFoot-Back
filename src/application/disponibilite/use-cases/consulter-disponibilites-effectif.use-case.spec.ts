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
    ...overrides.activiteRepository,
  } as unknown as ActiviteRepository;

  const utilisateurRepository = {
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    save: jest.fn(),
    findByProviderId: jest.fn().mockResolvedValue(null),
    updateRole: jest.fn(),
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
  describe('priorité de résolution de la disponibilité effective', () => {
    it('priorise la DisponibiliteActivite quand elle existe, même si une DisponibiliteJournee existe aussi', async () => {
      const activite = makeActivite();
      const utilisateur = makeUtilisateur();
      const disponibiliteJournee: DisponibiliteJournee = {
        id: 'dj-1',
        utilisateurId: utilisateur.id,
        date: activite.date,
        statut: 'absent',
      };
      const disponibiliteActivite: DisponibiliteActivite = {
        id: 'da-1',
        utilisateurId: utilisateur.id,
        activiteId: activite.id,
        statut: 'present',
        commentaire: 'Je viendrai en retard',
      };

      const { useCase } = makeUseCase({
        activiteRepository: {
          findUpcoming: jest.fn().mockResolvedValue([activite]),
        },
        utilisateurRepository: {
          findAll: jest.fn().mockResolvedValue([utilisateur]),
        },
        disponibiliteJourneeRepository: {
          findByDates: jest.fn().mockResolvedValue([disponibiliteJournee]),
        },
        disponibiliteActiviteRepository: {
          findByActiviteIds: jest.fn().mockResolvedValue([disponibiliteActivite]),
        },
      });

      const result = await useCase.execute({});

      expect(result.joueurs).toHaveLength(1);
      expect(result.joueurs[0].disponibilites[activite.id]).toEqual({
        statut: 'present',
        commentaire: 'Je viendrai en retard',
        source: 'activite',
      });
    });

    it('retombe sur la DisponibiliteJournee quand aucune DisponibiliteActivite n\'existe', async () => {
      const activite = makeActivite();
      const utilisateur = makeUtilisateur();
      const disponibiliteJournee: DisponibiliteJournee = {
        id: 'dj-1',
        utilisateurId: utilisateur.id,
        date: activite.date,
        statut: 'disponible',
        commentaire: 'Dispo toute la journée',
      };

      const { useCase } = makeUseCase({
        activiteRepository: {
          findUpcoming: jest.fn().mockResolvedValue([activite]),
        },
        utilisateurRepository: {
          findAll: jest.fn().mockResolvedValue([utilisateur]),
        },
        disponibiliteJourneeRepository: {
          findByDates: jest.fn().mockResolvedValue([disponibiliteJournee]),
        },
        disponibiliteActiviteRepository: {
          findByActiviteIds: jest.fn().mockResolvedValue([]),
        },
      });

      const result = await useCase.execute({});

      expect(result.joueurs[0].disponibilites[activite.id]).toEqual({
        statut: 'disponible',
        commentaire: 'Dispo toute la journée',
        source: 'journee',
      });
    });

    it('renvoie source "aucune" quand ni DisponibiliteActivite ni DisponibiliteJournee n\'existent', async () => {
      const activite = makeActivite();
      const utilisateur = makeUtilisateur();

      const { useCase } = makeUseCase({
        activiteRepository: {
          findUpcoming: jest.fn().mockResolvedValue([activite]),
        },
        utilisateurRepository: {
          findAll: jest.fn().mockResolvedValue([utilisateur]),
        },
      });

      const result = await useCase.execute({});

      expect(result.joueurs[0].disponibilites[activite.id]).toEqual({
        statut: 'autre',
        source: 'aucune',
      });
    });

    it("n'associe pas par erreur une DisponibiliteActivite d'un autre utilisateur", async () => {
      const activite = makeActivite();
      const utilisateur = makeUtilisateur({ id: 'user-cible' });
      const disponibiliteActiviteAutreUtilisateur: DisponibiliteActivite = {
        id: 'da-1',
        utilisateurId: 'autre-utilisateur',
        activiteId: activite.id,
        statut: 'present',
      };

      const { useCase } = makeUseCase({
        activiteRepository: {
          findUpcoming: jest.fn().mockResolvedValue([activite]),
        },
        utilisateurRepository: {
          findAll: jest.fn().mockResolvedValue([utilisateur]),
        },
        disponibiliteActiviteRepository: {
          findByActiviteIds: jest.fn().mockResolvedValue([disponibiliteActiviteAutreUtilisateur]),
        },
      });

      const result = await useCase.execute({});

      expect(result.joueurs[0].disponibilites[activite.id].source).toBe('aucune');
    });
  });

  describe('passthrough des champs equipe/commentaire (ActiviteColonneDto)', () => {
    it("transmet equipe et commentaire de l'activité dans ActiviteColonneDto quand ils sont renseignés", async () => {
      const activite = makeActivite({
        id: 'activite-equipe-a',
        equipe: 'A',
        commentaire: 'Apporter les maillots',
      });

      const { useCase } = makeUseCase({
        activiteRepository: {
          findUpcoming: jest.fn().mockResolvedValue([activite]),
        },
      });

      const result = await useCase.execute({});

      expect(result.activites[0]).toEqual(
        expect.objectContaining({
          id: 'activite-equipe-a',
          equipe: 'A',
          commentaire: 'Apporter les maillots',
        }),
      );
    });

    it("laisse equipe et commentaire indéfinis dans ActiviteColonneDto quand l'activité ne les porte pas", async () => {
      const activite = makeActivite({ id: 'activite-sans-equipe' });

      const { useCase } = makeUseCase({
        activiteRepository: {
          findUpcoming: jest.fn().mockResolvedValue([activite]),
        },
      });

      const result = await useCase.execute({});

      expect(result.activites[0].equipe).toBeUndefined();
      expect(result.activites[0].commentaire).toBeUndefined();
    });

    it('transmet equipe via la résolution par activiteId (findById)', async () => {
      const activite = makeActivite({ id: 'activite-ciblee', equipe: 'Vet' });

      const { useCase } = makeUseCase({
        activiteRepository: {
          findById: jest.fn().mockResolvedValue(activite),
        },
      });

      const result = await useCase.execute({ activiteId: 'activite-ciblee' });

      expect(result.activites[0].equipe).toBe('Vet');
    });
  });

  describe('résolution des activités ciblées', () => {
    it('utilise findById quand activiteId est fourni, sans appeler findUpcoming', async () => {
      const activite = makeActivite({ id: 'activite-ciblee' });

      const { useCase, activiteRepository } = makeUseCase({
        activiteRepository: {
          findById: jest.fn().mockResolvedValue(activite),
        },
      });

      const result = await useCase.execute({ activiteId: 'activite-ciblee' });

      expect(activiteRepository.findById).toHaveBeenCalledWith('activite-ciblee');
      expect(activiteRepository.findUpcoming).not.toHaveBeenCalled();
      expect(result.activites).toEqual([
        {
          id: activite.id,
          date: activite.date,
          heureConvocation: activite.heureConvocation,
          heureDebut: activite.heureDebut,
          label: activite.label,
          type: activite.type,
        },
      ]);
    });

    it("activiteId prévaut sur date quand les deux sont fournis", async () => {
      const activite = makeActivite({ id: 'activite-ciblee' });

      const { useCase, activiteRepository } = makeUseCase({
        activiteRepository: {
          findById: jest.fn().mockResolvedValue(activite),
        },
      });

      await useCase.execute({ activiteId: 'activite-ciblee', date: '2026-07-09' });

      expect(activiteRepository.findById).toHaveBeenCalledWith('activite-ciblee');
      expect(activiteRepository.findUpcoming).not.toHaveBeenCalled();
    });

    it("renvoie une liste d'activités vide quand activiteId ne correspond à aucune activité", async () => {
      const { useCase } = makeUseCase({
        activiteRepository: {
          findById: jest.fn().mockResolvedValue(null),
        },
      });

      const result = await useCase.execute({ activiteId: 'inconnue' });

      expect(result.activites).toEqual([]);
    });

    it('filtre en mémoire les activités à venir par date quand seul "date" est fourni', async () => {
      const activiteJourCible = makeActivite({ id: 'a1', date: '2026-07-10' });
      const activiteAutreJour = makeActivite({ id: 'a2', date: '2026-07-11' });

      const { useCase, activiteRepository } = makeUseCase({
        activiteRepository: {
          findUpcoming: jest.fn().mockResolvedValue([activiteJourCible, activiteAutreJour]),
        },
      });

      const result = await useCase.execute({ date: '2026-07-10' });

      expect(activiteRepository.findUpcoming).toHaveBeenCalledWith('');
      expect(result.activites.map((a) => a.id)).toEqual(['a1']);
    });

    it("appelle findUpcoming avec la date du jour (ISO yyyy-mm-dd) quand aucun filtre n'est fourni", async () => {
      const { useCase, activiteRepository } = makeUseCase({
        activiteRepository: {
          findUpcoming: jest.fn().mockResolvedValue([]),
        },
      });

      await useCase.execute({});

      const aujourdHui = new Date().toISOString().slice(0, 10);
      expect(activiteRepository.findUpcoming).toHaveBeenCalledWith(aujourdHui);
    });

    it('gère plusieurs activités à la même date avec des disponibilités de journée et activité distinctes', async () => {
      const activite1 = makeActivite({ id: 'a1', date: '2026-07-15', label: 'Entraînement' });
      const activite2 = makeActivite({ id: 'a2', date: '2026-07-15', label: 'Match' });
      const utilisateur = makeUtilisateur();
      const disponibiliteJournee: DisponibiliteJournee = {
        id: 'dj-1',
        utilisateurId: utilisateur.id,
        date: '2026-07-15',
        statut: 'disponible',
      };
      const disponibiliteActiviteSurA2: DisponibiliteActivite = {
        id: 'da-1',
        utilisateurId: utilisateur.id,
        activiteId: 'a2',
        statut: 'absent',
        commentaire: 'Empêché pour le match uniquement',
      };

      const { useCase } = makeUseCase({
        activiteRepository: {
          findUpcoming: jest.fn().mockResolvedValue([activite1, activite2]),
        },
        utilisateurRepository: {
          findAll: jest.fn().mockResolvedValue([utilisateur]),
        },
        disponibiliteJourneeRepository: {
          findByDates: jest.fn().mockResolvedValue([disponibiliteJournee]),
        },
        disponibiliteActiviteRepository: {
          findByActiviteIds: jest.fn().mockResolvedValue([disponibiliteActiviteSurA2]),
        },
      });

      const result = await useCase.execute({});

      expect(result.joueurs[0].disponibilites['a1']).toEqual({
        statut: 'disponible',
        commentaire: undefined,
        source: 'journee',
      });
      expect(result.joueurs[0].disponibilites['a2']).toEqual({
        statut: 'absent',
        commentaire: 'Empêché pour le match uniquement',
        source: 'activite',
      });
    });
  });

  describe('cas limites', () => {
    it("renvoie une liste de joueurs vide quand aucun utilisateur n'existe", async () => {
      const activite = makeActivite();

      const { useCase } = makeUseCase({
        activiteRepository: {
          findUpcoming: jest.fn().mockResolvedValue([activite]),
        },
        utilisateurRepository: {
          findAll: jest.fn().mockResolvedValue([]),
        },
      });

      const result = await useCase.execute({});

      expect(result.joueurs).toEqual([]);
      expect(result.activites).toHaveLength(1);
    });

    it("renvoie une liste d'activités vide et des joueurs sans disponibilités quand aucune activité n'existe", async () => {
      const utilisateur = makeUtilisateur();

      const { useCase, disponibiliteJourneeRepository, disponibiliteActiviteRepository } = makeUseCase({
        activiteRepository: {
          findUpcoming: jest.fn().mockResolvedValue([]),
        },
        utilisateurRepository: {
          findAll: jest.fn().mockResolvedValue([utilisateur]),
        },
      });

      const result = await useCase.execute({});

      expect(result.activites).toEqual([]);
      expect(result.joueurs).toEqual([
        { utilisateurId: utilisateur.id, displayName: utilisateur.displayName, disponibilites: {} },
      ]);
      expect(disponibiliteJourneeRepository.findByDates).toHaveBeenCalledWith([]);
      expect(disponibiliteActiviteRepository.findByActiviteIds).toHaveBeenCalledWith([]);
    });

    it('déduplique les dates distinctes transmises à findByDates quand plusieurs activités partagent la même date', async () => {
      const activite1 = makeActivite({ id: 'a1', date: '2026-08-01' });
      const activite2 = makeActivite({ id: 'a2', date: '2026-08-01' });
      const activite3 = makeActivite({ id: 'a3', date: '2026-08-02' });

      const { useCase, disponibiliteJourneeRepository } = makeUseCase({
        activiteRepository: {
          findUpcoming: jest.fn().mockResolvedValue([activite1, activite2, activite3]),
        },
      });

      await useCase.execute({});

      expect(disponibiliteJourneeRepository.findByDates).toHaveBeenCalledWith([
        '2026-08-01',
        '2026-08-02',
      ]);
    });
  });

  describe('non-régression — activités sans date (cf. spec pour-grer-les-activits-il-faut-pouvoir-bouger-lactivit-dune-)', () => {
    it("exclut une activité sans date (date undefined) du résultat, même si elle est renvoyée par findUpcoming", async () => {
      const activiteAvecDate = makeActivite({ id: 'avec-date', date: '2026-07-20' });
      const activiteSansDate = makeActivite({ id: 'sans-date', date: undefined });
      const utilisateur = makeUtilisateur();

      const { useCase } = makeUseCase({
        activiteRepository: {
          findUpcoming: jest.fn().mockResolvedValue([activiteAvecDate, activiteSansDate]),
        },
        utilisateurRepository: {
          findAll: jest.fn().mockResolvedValue([utilisateur]),
        },
      });

      const result = await useCase.execute({});

      expect(result.activites.map((a) => a.id)).toEqual(['avec-date']);
      expect(result.joueurs[0].disponibilites).not.toHaveProperty('sans-date');
    });

    it("exclut une activité sans date ciblée explicitement via activiteId (cas limite : activité non encore planifiée)", async () => {
      const activiteSansDate = makeActivite({ id: 'cible-sans-date', date: undefined });

      const { useCase } = makeUseCase({
        activiteRepository: {
          findById: jest.fn().mockResolvedValue(activiteSansDate),
        },
      });

      const result = await useCase.execute({ activiteId: 'cible-sans-date' });

      expect(result.activites).toEqual([]);
    });

    it("n'appelle pas findByDates/findByActiviteIds avec l'id d'une activité sans date écartée", async () => {
      const activiteSansDate = makeActivite({ id: 'sans-date', date: undefined });

      const { useCase, disponibiliteJourneeRepository, disponibiliteActiviteRepository } = makeUseCase({
        activiteRepository: {
          findUpcoming: jest.fn().mockResolvedValue([activiteSansDate]),
        },
      });

      await useCase.execute({});

      expect(disponibiliteJourneeRepository.findByDates).toHaveBeenCalledWith([]);
      expect(disponibiliteActiviteRepository.findByActiviteIds).toHaveBeenCalledWith([]);
    });
  });
});
