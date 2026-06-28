import { DisponibilitesController } from './disponibilites.controller';
import type { ConsulterDisponibilitesEffectifUseCase } from '../../../application/disponibilite/use-cases/consulter-disponibilites-effectif.use-case';
import type { DeclarerDisponibiliteActiviteUseCase } from '../../../application/disponibilite/use-cases/declarer-disponibilite-activite.use-case';
import type { SupprimerDisponibiliteActiviteUseCase } from '../../../application/disponibilite/use-cases/supprimer-disponibilite-activite.use-case';
import type { DisponibilitesEffectifResponseDto } from '../../../application/disponibilite/dto/disponibilite-effectif.dto';
import type { DeclarerDisponibiliteActiviteDto } from '../../../application/disponibilite/dto/declarer-disponibilite-activite.dto';
import type { DisponibiliteActivite } from '../../../domain/disponibilite/entities/disponibilite-activite.entity';
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

  return new DisponibilitesController(consulterUseCase, declarerUseCase, supprimerUseCase);
}

const reponseVide: DisponibilitesEffectifResponseDto = { activites: [], joueurs: [] };

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
});
