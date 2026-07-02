import { DisponibilitesController } from './disponibilites.controller';
import type { ConsulterDisponibilitesEffectifUseCase } from '../../../application/disponibilite/use-cases/consulter-disponibilites-effectif.use-case';
import type { ConsulterResumeAccueilUseCase } from '../../../application/disponibilite/use-cases/consulter-resume-accueil.use-case';
import type { DeclarerDisponibiliteActiviteUseCase } from '../../../application/disponibilite/use-cases/declarer-disponibilite-activite.use-case';
import type { SupprimerDisponibiliteActiviteUseCase } from '../../../application/disponibilite/use-cases/supprimer-disponibilite-activite.use-case';
import type { DeclarerDisponibiliteJourneeUseCase } from '../../../application/disponibilite/use-cases/declarer-disponibilite-journee.use-case';
import type { ListerMesDisponibilitesJourneeUseCase } from '../../../application/disponibilite/use-cases/lister-mes-disponibilites-journee.use-case';
import type { DisponibilitesEffectifResponseDto } from '../../../application/disponibilite/dto/disponibilite-effectif.dto';
import type { EffectifMatchResponseDto } from '../../../application/disponibilite/dto/effectif-match.dto';
import type { ConsulterEffectifMatchUseCase } from '../../../application/disponibilite/use-cases/consulter-effectif-match.use-case';
import type { ResumeAccueilDto } from '../../../application/disponibilite/dto/resume-accueil.dto';
import type { DeclarerDisponibiliteActiviteDto } from '../../../application/disponibilite/dto/declarer-disponibilite-activite.dto';
import type { DeclarerDisponibiliteJourneeDto } from '../../../application/disponibilite/dto/declarer-disponibilite-journee.dto';
import type { DisponibiliteActivite } from '../../../domain/disponibilite/entities/disponibilite-activite.entity';
import type { DisponibiliteJournee } from '../../../domain/disponibilite/entities/disponibilite-journee.entity';
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

function makeController(options: {
  getEffectif?: jest.Mock;
  declarer?: jest.Mock;
  supprimer?: jest.Mock;
  declarerJournee?: jest.Mock;
  listerMesDisponibilitesJournee?: jest.Mock;
  getResumeAccueil?: jest.Mock;
  getEffectifMatch?: jest.Mock;
} = {}) {
  const consulterUseCase = {
    execute: options.getEffectif ?? jest.fn().mockResolvedValue(reponseVide),
  } as unknown as ConsulterDisponibilitesEffectifUseCase;
  const declarerUseCase = {
    execute: options.declarer ?? jest.fn(),
  } as unknown as DeclarerDisponibiliteActiviteUseCase;
  const supprimerUseCase = {
    execute: options.supprimer ?? jest.fn(),
  } as unknown as SupprimerDisponibiliteActiviteUseCase;
  const declarerJourneeUseCase = {
    execute: options.declarerJournee ?? jest.fn(),
  } as unknown as DeclarerDisponibiliteJourneeUseCase;
  const listerMesDisponibilitesJourneeUseCase = {
    execute: options.listerMesDisponibilitesJournee ?? jest.fn().mockResolvedValue([]),
  } as unknown as ListerMesDisponibilitesJourneeUseCase;
  const consulterResumeAccueilUseCase = {
    execute: options.getResumeAccueil ?? jest.fn().mockResolvedValue(resumeAccueilVide),
  } as unknown as ConsulterResumeAccueilUseCase;
  const consulterEffectifMatchUseCase = {
    execute: options.getEffectifMatch ?? jest.fn().mockResolvedValue(effectifMatchVide),
  } as unknown as ConsulterEffectifMatchUseCase;

  return new DisponibilitesController(
    consulterUseCase,
    declarerUseCase,
    supprimerUseCase,
    declarerJourneeUseCase,
    listerMesDisponibilitesJourneeUseCase,
    consulterResumeAccueilUseCase,
    consulterEffectifMatchUseCase,
  );
}

const reponseVide: DisponibilitesEffectifResponseDto = { activites: [], joueurs: [] };
const resumeAccueilVide: ResumeAccueilDto = {
  dernierePassee: null,
  prochainesDates: [],
  tableauDeBord: { totalAVenir: 0, renseigneesAVenir: 0, pourcentageRenseignement: 0 },
};
const effectifMatchVide: EffectifMatchResponseDto = {
  matchCourant: null,
  matchPrecedentId: null,
  matchSuivantId: null,
  badge: null,
  joueurs: [],
};

describe('DisponibilitesController', () => {
  describe('getEffectif', () => {
    it('délègue au use case sans aucun paramètre quand ni date ni activiteId ne sont fournis', async () => {
      const getEffectif = jest.fn().mockResolvedValue(reponseVide);
      const controller = makeController({ getEffectif });

      const result = await controller.getEffectif();

      expect(getEffectif).toHaveBeenCalledWith({ date: undefined, activiteId: undefined });
      expect(result).toBe(reponseVide);
    });

    it('mappe le query param "date" vers le DTO transmis au use case', async () => {
      const getEffectif = jest.fn().mockResolvedValue(reponseVide);
      const controller = makeController({ getEffectif });

      await controller.getEffectif('2026-07-01');

      expect(getEffectif).toHaveBeenCalledWith({ date: '2026-07-01', activiteId: undefined });
    });

    it('mappe le query param "activiteId" vers le DTO transmis au use case', async () => {
      const getEffectif = jest.fn().mockResolvedValue(reponseVide);
      const controller = makeController({ getEffectif });

      await controller.getEffectif(undefined, 'activite-42');

      expect(getEffectif).toHaveBeenCalledWith({ date: undefined, activiteId: 'activite-42' });
    });

    it('mappe à la fois "date" et "activiteId" quand les deux sont fournis (résolution de priorité déléguée au use case)', async () => {
      const getEffectif = jest.fn().mockResolvedValue(reponseVide);
      const controller = makeController({ getEffectif });

      await controller.getEffectif('2026-07-01', 'activite-42');

      expect(getEffectif).toHaveBeenCalledWith({ date: '2026-07-01', activiteId: 'activite-42' });
    });

    it('renvoie directement la réponse du use case', async () => {
      const reponse: DisponibilitesEffectifResponseDto = {
        activites: [
          {
            id: 'a1',
            date: '2026-07-01',
            heureConvocation: '14:00',
            heureDebut: '15:00',
            label: 'Match',
            type: 'match',
          },
        ],
        joueurs: [],
      };
      const getEffectif = jest.fn().mockResolvedValue(reponse);
      const controller = makeController({ getEffectif });

      const result = await controller.getEffectif();

      expect(result).toBe(reponse);
    });
  });

  describe('getEffectifMatch', () => {
    it("délègue au use case sans matchId quand aucun query param n'est fourni", async () => {
      const getEffectifMatch = jest.fn().mockResolvedValue(effectifMatchVide);
      const controller = makeController({ getEffectifMatch });

      const result = await controller.getEffectifMatch();

      expect(getEffectifMatch).toHaveBeenCalledWith({ matchId: undefined });
      expect(result).toBe(effectifMatchVide);
    });

    it('mappe le query param "matchId" vers le DTO transmis au use case', async () => {
      const getEffectifMatch = jest.fn().mockResolvedValue(effectifMatchVide);
      const controller = makeController({ getEffectifMatch });

      await controller.getEffectifMatch('match-42');

      expect(getEffectifMatch).toHaveBeenCalledWith({ matchId: 'match-42' });
    });

    it('renvoie directement la réponse du use case', async () => {
      const reponse: EffectifMatchResponseDto = {
        matchCourant: {
          id: 'm1',
          date: '2026-07-01',
          heureConvocation: '14:00',
          heureDebut: '15:00',
          label: 'Match',
          type: 'match',
        },
        matchPrecedentId: null,
        matchSuivantId: null,
        badge: { nbPresents: 0, nbDisponibles: 0, pourcentageSaisie: 0 },
        joueurs: [],
      };
      const getEffectifMatch = jest.fn().mockResolvedValue(reponse);
      const controller = makeController({ getEffectifMatch });

      const result = await controller.getEffectifMatch('m1');

      expect(result).toBe(reponse);
    });
  });

  describe('declarerDisponibiliteActivite', () => {
    it('délègue au use case avec activiteId, dto et utilisateur connecté, et mappe le résultat en DTO', async () => {
      const surcharge: DisponibiliteActivite = {
        id: 'dispo-1',
        utilisateurId: 'joueur-1',
        activiteId: 'activite-1',
        statut: 'present',
        commentaire: 'Je viens',
      };
      const declarer = jest.fn().mockResolvedValue(surcharge);
      const controller = makeController({ declarer });
      const dto: DeclarerDisponibiliteActiviteDto = { statut: 'present', commentaire: 'Je viens' };
      const utilisateur = makeUtilisateur();

      const result = await controller.declarerDisponibiliteActivite('activite-1', dto, utilisateur);

      expect(declarer).toHaveBeenCalledWith('activite-1', dto, utilisateur);
      expect(result).toEqual({
        id: 'dispo-1',
        utilisateurId: 'joueur-1',
        activiteId: 'activite-1',
        statut: 'present',
        commentaire: 'Je viens',
      });
    });

    it('propage les exceptions levées par le use case (ex: ForbiddenException, NotFoundException)', async () => {
      const declarer = jest.fn().mockRejectedValue(new Error('Activité introuvable'));
      const controller = makeController({ declarer });

      await expect(
        controller.declarerDisponibiliteActivite(
          'activite-inconnue',
          { statut: 'absent' } as DeclarerDisponibiliteActiviteDto,
          makeUtilisateur(),
        ),
      ).rejects.toThrow('Activité introuvable');
    });
  });

  describe('supprimerDisponibiliteActivite', () => {
    it('délègue au use case avec activiteId, query param utilisateurId et utilisateur connecté', async () => {
      const supprimer = jest.fn().mockResolvedValue(undefined);
      const controller = makeController({ supprimer });
      const utilisateur = makeUtilisateur({ id: 'admin-1', role: 'admin' });

      await controller.supprimerDisponibiliteActivite('activite-1', 'joueur-cible', utilisateur);

      expect(supprimer).toHaveBeenCalledWith('activite-1', 'joueur-cible', utilisateur);
    });

    it('transmet undefined quand aucun query param utilisateurId n\'est fourni', async () => {
      const supprimer = jest.fn().mockResolvedValue(undefined);
      const controller = makeController({ supprimer });
      const utilisateur = makeUtilisateur();

      await controller.supprimerDisponibiliteActivite('activite-1', undefined, utilisateur);

      expect(supprimer).toHaveBeenCalledWith('activite-1', undefined, utilisateur);
    });

    it('propage les exceptions levées par le use case (ex: ForbiddenException, NotFoundException)', async () => {
      const supprimer = jest.fn().mockRejectedValue(new Error('Aucune surcharge'));
      const controller = makeController({ supprimer });

      await expect(
        controller.supprimerDisponibiliteActivite('activite-1', undefined, makeUtilisateur()),
      ).rejects.toThrow('Aucune surcharge');
    });
  });

  describe('declarerDisponibiliteJournee', () => {
    it('délègue au use case avec date, dto et utilisateur connecté, et mappe le résultat en DTO', async () => {
      const disponibilite: DisponibiliteJournee = {
        id: 'dispo-journee-1',
        utilisateurId: 'joueur-1',
        date: '2026-07-01',
        statut: 'present',
        commentaire: 'Je viens',
      };
      const declarerJournee = jest.fn().mockResolvedValue(disponibilite);
      const controller = makeController({ declarerJournee });
      const dto: DeclarerDisponibiliteJourneeDto = { statut: 'present', commentaire: 'Je viens' };
      const utilisateur = makeUtilisateur();

      const result = await controller.declarerDisponibiliteJournee('2026-07-01', dto, utilisateur);

      expect(declarerJournee).toHaveBeenCalledWith('2026-07-01', dto, utilisateur);
      expect(result).toEqual({
        id: 'dispo-journee-1',
        utilisateurId: 'joueur-1',
        date: '2026-07-01',
        statut: 'present',
        commentaire: 'Je viens',
      });
    });

    it('propage les exceptions levées par le use case (ex: ForbiddenException)', async () => {
      const declarerJournee = jest
        .fn()
        .mockRejectedValue(new Error("Seul un admin peut modifier la disponibilité d'un autre utilisateur"));
      const controller = makeController({ declarerJournee });

      await expect(
        controller.declarerDisponibiliteJournee(
          '2026-07-01',
          { statut: 'absent', utilisateurId: 'autre-joueur' } as DeclarerDisponibiliteJourneeDto,
          makeUtilisateur(),
        ),
      ).rejects.toThrow("Seul un admin peut modifier la disponibilité d'un autre utilisateur");
    });
  });

  describe('listerMesDisponibilitesJournee', () => {
    it("délègue au use case avec l'utilisateur connecté et mappe chaque résultat en DTO", async () => {
      const disponibilites: DisponibiliteJournee[] = [
        { id: 'd1', utilisateurId: 'joueur-1', date: '2026-07-01', statut: 'present' },
        { id: 'd2', utilisateurId: 'joueur-1', date: '2026-07-08', statut: 'absent', commentaire: 'Vacances' },
      ];
      const listerMesDisponibilitesJournee = jest.fn().mockResolvedValue(disponibilites);
      const controller = makeController({ listerMesDisponibilitesJournee });
      const utilisateur = makeUtilisateur();

      const result = await controller.listerMesDisponibilitesJournee(utilisateur);

      expect(listerMesDisponibilitesJournee).toHaveBeenCalledWith(utilisateur);
      expect(result).toEqual([
        { id: 'd1', utilisateurId: 'joueur-1', date: '2026-07-01', statut: 'present' },
        { id: 'd2', utilisateurId: 'joueur-1', date: '2026-07-08', statut: 'absent', commentaire: 'Vacances' },
      ]);
    });

    it("renvoie un tableau vide quand l'utilisateur connecté n'a aucune disponibilité de journée déclarée", async () => {
      const listerMesDisponibilitesJournee = jest.fn().mockResolvedValue([]);
      const controller = makeController({ listerMesDisponibilitesJournee });

      const result = await controller.listerMesDisponibilitesJournee(makeUtilisateur());

      expect(result).toEqual([]);
    });

    it('propage les exceptions levées par le use case', async () => {
      const listerMesDisponibilitesJournee = jest.fn().mockRejectedValue(new Error('Erreur inattendue'));
      const controller = makeController({ listerMesDisponibilitesJournee });

      await expect(
        controller.listerMesDisponibilitesJournee(makeUtilisateur()),
      ).rejects.toThrow('Erreur inattendue');
    });
  });

  describe('getResumeAccueil', () => {
    it("délègue au use case avec l'utilisateur connecté et renvoie directement sa réponse", async () => {
      const resume: ResumeAccueilDto = {
        dernierePassee: null,
        prochainesDates: [],
        tableauDeBord: { totalAVenir: 2, renseigneesAVenir: 1, pourcentageRenseignement: 50 },
      };
      const getResumeAccueil = jest.fn().mockResolvedValue(resume);
      const controller = makeController({ getResumeAccueil });
      const utilisateur = makeUtilisateur();

      const result = await controller.getResumeAccueil(utilisateur);

      expect(getResumeAccueil).toHaveBeenCalledWith(utilisateur);
      expect(result).toBe(resume);
    });

    it('propage les exceptions levées par le use case', async () => {
      const getResumeAccueil = jest.fn().mockRejectedValue(new Error('Erreur inattendue'));
      const controller = makeController({ getResumeAccueil });

      await expect(controller.getResumeAccueil(makeUtilisateur())).rejects.toThrow(
        'Erreur inattendue',
      );
    });
  });
});
