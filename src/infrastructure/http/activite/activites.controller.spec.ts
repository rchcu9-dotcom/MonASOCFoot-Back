import 'reflect-metadata';
import { ActivitesController } from './activites.controller';
import { REQUIRE_ADMIN_KEY } from '../shared/require-admin.decorator';
import { REQUIRE_AUTH_KEY } from '../shared/require-auth.decorator';
import type { Activite } from '../../../domain/activite/entities/activite.entity';
import type { CreerActiviteUseCase } from '../../../application/activite/use-cases/creer-activite.use-case';
import type { ImporterMatchsDistrictUseCase } from '../../../application/activite/use-cases/importer-matchs-district.use-case';
import type { ListerActivitesUseCase } from '../../../application/activite/use-cases/lister-activites.use-case';
import type { ModifierActiviteUseCase } from '../../../application/activite/use-cases/modifier-activite.use-case';
import type { SupprimerActiviteUseCase } from '../../../application/activite/use-cases/supprimer-activite.use-case';
import type { ImportMatchsResultatDto } from '../../../application/activite/dto/import-matchs-resultat.dto';

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

function makeImportResultat(overrides: Partial<ImportMatchsResultatDto> = {}): ImportMatchsResultatDto {
  return {
    matchsRecuperes: 0,
    crees: 0,
    misAJour: 0,
    ignores: 0,
    erreurs: [],
    ...overrides,
  };
}

function makeController(overrides: {
  lister?: jest.Mock;
  creer?: jest.Mock;
  modifier?: jest.Mock;
  supprimer?: jest.Mock;
  importerDistrict?: jest.Mock;
} = {}) {
  const listerActivitesUseCase = {
    execute: overrides.lister ?? jest.fn().mockResolvedValue([]),
  } as unknown as ListerActivitesUseCase;
  const creerActiviteUseCase = {
    execute: overrides.creer ?? jest.fn().mockResolvedValue(makeActivite()),
  } as unknown as CreerActiviteUseCase;
  const modifierActiviteUseCase = {
    execute: overrides.modifier ?? jest.fn().mockResolvedValue(makeActivite()),
  } as unknown as ModifierActiviteUseCase;
  const supprimerActiviteUseCase = {
    execute: overrides.supprimer ?? jest.fn().mockResolvedValue(undefined),
  } as unknown as SupprimerActiviteUseCase;
  const importerMatchsDistrictUseCase = {
    execute: overrides.importerDistrict ?? jest.fn().mockResolvedValue(makeImportResultat()),
  } as unknown as ImporterMatchsDistrictUseCase;

  const controller = new ActivitesController(
    listerActivitesUseCase,
    creerActiviteUseCase,
    modifierActiviteUseCase,
    supprimerActiviteUseCase,
    importerMatchsDistrictUseCase,
  );

  return {
    controller,
    listerActivitesUseCase,
    creerActiviteUseCase,
    modifierActiviteUseCase,
    supprimerActiviteUseCase,
    importerMatchsDistrictUseCase,
  };
}

describe('ActivitesController', () => {
  describe('protection par rôle (métadonnées des guards)', () => {
    it('GET /activites requiert seulement RequireAuth (lecture ouverte à tout utilisateur authentifié)', () => {
      expect(Reflect.getMetadata(REQUIRE_AUTH_KEY, ActivitesController.prototype.findAll)).toBe(true);
      expect(Reflect.getMetadata(REQUIRE_ADMIN_KEY, ActivitesController.prototype.findAll)).toBeUndefined();
    });

    it('POST /activites requiert RequireAdmin', () => {
      expect(Reflect.getMetadata(REQUIRE_ADMIN_KEY, ActivitesController.prototype.create)).toBe(true);
    });

    it('PATCH /activites/:id requiert RequireAdmin', () => {
      expect(Reflect.getMetadata(REQUIRE_ADMIN_KEY, ActivitesController.prototype.update)).toBe(true);
    });

    it('DELETE /activites/:id requiert RequireAdmin', () => {
      expect(Reflect.getMetadata(REQUIRE_ADMIN_KEY, ActivitesController.prototype.remove)).toBe(true);
    });

    it('POST /activites/import-district requiert RequireAdmin', () => {
      expect(
        Reflect.getMetadata(REQUIRE_ADMIN_KEY, ActivitesController.prototype.importerDistrict),
      ).toBe(true);
    });
  });

  describe('findAll', () => {
    it('délègue à ListerActivitesUseCase et mappe le résultat en ActiviteDto[]', async () => {
      const activite = makeActivite();
      const { controller, listerActivitesUseCase } = makeController({
        lister: jest.fn().mockResolvedValue([activite]),
      });

      const result = await controller.findAll();

      expect(listerActivitesUseCase.execute).toHaveBeenCalledTimes(1);
      expect(result).toEqual([activite]);
    });
  });

  describe('create', () => {
    it('délègue au DTO reçu à CreerActiviteUseCase et renvoie l\'ActiviteDto créé', async () => {
      const activiteCreee = makeActivite({ id: 'nouvelle-activite' });
      const { controller, creerActiviteUseCase } = makeController({
        creer: jest.fn().mockResolvedValue(activiteCreee),
      });
      const dto = {
        date: '2026-07-01',
        heureConvocation: '14:00',
        heureDebut: '15:00',
        label: 'Match amical',
        type: 'match' as const,
      };

      const result = await controller.create(dto);

      expect(creerActiviteUseCase.execute).toHaveBeenCalledWith(dto);
      expect(result).toEqual(activiteCreee);
    });
  });

  describe('update', () => {
    it("délègue l'id et le DTO à ModifierActiviteUseCase et renvoie l'ActiviteDto modifié", async () => {
      const activiteModifiee = makeActivite({ label: 'Label modifié' });
      const { controller, modifierActiviteUseCase } = makeController({
        modifier: jest.fn().mockResolvedValue(activiteModifiee),
      });
      const dto = { label: 'Label modifié' };

      const result = await controller.update('activite-1', dto);

      expect(modifierActiviteUseCase.execute).toHaveBeenCalledWith('activite-1', dto);
      expect(result).toEqual(activiteModifiee);
    });
  });

  describe('remove', () => {
    it("délègue l'id à SupprimerActiviteUseCase", async () => {
      const { controller, supprimerActiviteUseCase } = makeController();

      await controller.remove('activite-1');

      expect(supprimerActiviteUseCase.execute).toHaveBeenCalledWith('activite-1');
    });
  });

  describe('importerDistrict', () => {
    it('délègue à ImporterMatchsDistrictUseCase et renvoie son résultat tel quel', async () => {
      const resultat = makeImportResultat({ matchsRecuperes: 3, crees: 2, misAJour: 1 });
      const { controller, importerMatchsDistrictUseCase } = makeController({
        importerDistrict: jest.fn().mockResolvedValue(resultat),
      });

      const result = await controller.importerDistrict();

      expect(importerMatchsDistrictUseCase.execute).toHaveBeenCalledTimes(1);
      expect(importerMatchsDistrictUseCase.execute).toHaveBeenCalledWith();
      expect(result).toEqual(resultat);
    });

    it("propage l'erreur levée par le use case (ex. source non configurée)", async () => {
      const erreur = new Error('Import indisponible');
      const { controller } = makeController({
        importerDistrict: jest.fn().mockRejectedValue(erreur),
      });

      await expect(controller.importerDistrict()).rejects.toThrow(erreur);
    });
  });
});
