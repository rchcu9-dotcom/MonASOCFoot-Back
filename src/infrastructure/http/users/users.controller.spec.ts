import 'reflect-metadata';
import { UsersController } from './users.controller';
import { REQUIRE_ADMIN_KEY } from '../shared/require-admin.decorator';
import { REQUIRE_AUTH_KEY } from '../shared/require-auth.decorator';
import type { Utilisateur } from '../../../domain/utilisateur/entities/utilisateur.entity';
import type { ListerUtilisateursUseCase } from '../../../application/utilisateur/use-cases/lister-utilisateurs.use-case';
import type { ModifierRoleUtilisateurUseCase } from '../../../application/utilisateur/use-cases/modifier-role-utilisateur.use-case';
import type { ModifierProfilUtilisateurUseCase } from '../../../application/utilisateur/use-cases/modifier-profil-utilisateur.use-case';

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

function makeController(
  overrides: { lister?: jest.Mock; modifier?: jest.Mock; modifierProfil?: jest.Mock } = {},
) {
  const listerUtilisateursUseCase = {
    execute: overrides.lister ?? jest.fn().mockResolvedValue([]),
  } as unknown as ListerUtilisateursUseCase;
  const modifierRoleUtilisateurUseCase = {
    execute: overrides.modifier ?? jest.fn().mockResolvedValue(makeUtilisateur()),
  } as unknown as ModifierRoleUtilisateurUseCase;
  const modifierProfilUtilisateurUseCase = {
    execute: overrides.modifierProfil ?? jest.fn().mockResolvedValue(makeUtilisateur()),
  } as unknown as ModifierProfilUtilisateurUseCase;

  const controller = new UsersController(
    listerUtilisateursUseCase,
    modifierRoleUtilisateurUseCase,
    modifierProfilUtilisateurUseCase,
  );

  return { controller, listerUtilisateursUseCase, modifierRoleUtilisateurUseCase, modifierProfilUtilisateurUseCase };
}

describe('UsersController', () => {
  describe('protection par rôle (métadonnées des guards)', () => {
    it('GET /users requiert RequireAdmin (la liste expose des emails — PII)', () => {
      expect(Reflect.getMetadata(REQUIRE_ADMIN_KEY, UsersController.prototype.findAll)).toBe(true);
    });

    it('PATCH /users/:id/role requiert RequireAdmin', () => {
      expect(Reflect.getMetadata(REQUIRE_ADMIN_KEY, UsersController.prototype.modifierRole)).toBe(true);
    });

    it("PATCH /users/me/profil requiert RequireAuth (self-service, pas RequireAdmin)", () => {
      expect(Reflect.getMetadata(REQUIRE_AUTH_KEY, UsersController.prototype.modifierMonProfil)).toBe(true);
      expect(Reflect.getMetadata(REQUIRE_ADMIN_KEY, UsersController.prototype.modifierMonProfil)).not.toBe(true);
    });
  });

  describe('findAll', () => {
    it('délègue à ListerUtilisateursUseCase et mappe le résultat en UtilisateurDto[]', async () => {
      const utilisateur = makeUtilisateur();
      const { controller, listerUtilisateursUseCase } = makeController({
        lister: jest.fn().mockResolvedValue([utilisateur]),
      });

      const result = await controller.findAll();

      expect(listerUtilisateursUseCase.execute).toHaveBeenCalledTimes(1);
      expect(result).toEqual([utilisateur]);
    });

    it('renvoie une liste vide quand le use case ne renvoie rien', async () => {
      const { controller } = makeController({ lister: jest.fn().mockResolvedValue([]) });

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('modifierRole', () => {
    it("délègue l'id, le DTO et l'id de l'utilisateur connecté (via @CurrentUser()) à ModifierRoleUtilisateurUseCase", async () => {
      const utilisateurModifie = makeUtilisateur({ id: 'cible', role: 'admin' });
      const { controller, modifierRoleUtilisateurUseCase } = makeController({
        modifier: jest.fn().mockResolvedValue(utilisateurModifie),
      });
      const dto = { role: 'admin' as const };
      const utilisateurConnecte = makeUtilisateur({ id: 'admin-connecte', role: 'admin' });

      const result = await controller.modifierRole('cible', dto, utilisateurConnecte);

      expect(modifierRoleUtilisateurUseCase.execute).toHaveBeenCalledWith('cible', dto, 'admin-connecte');
      expect(result).toEqual(utilisateurModifie);
    });
  });

  describe('modifierMonProfil', () => {
    it("délègue le DTO et l'id de l'utilisateur connecté (via @CurrentUser()) à ModifierProfilUtilisateurUseCase — jamais un id de cible distinct", async () => {
      const utilisateurModifie = makeUtilisateur({
        id: 'user-1',
        dateNaissance: '1990-05-12',
        numeroLicence: '12345678',
      });
      const { controller, modifierProfilUtilisateurUseCase } = makeController({
        modifierProfil: jest.fn().mockResolvedValue(utilisateurModifie),
      });
      const dto = { dateNaissance: '1990-05-12', numeroLicence: '12345678' };
      const utilisateurConnecte = makeUtilisateur({ id: 'user-1' });

      const result = await controller.modifierMonProfil(dto, utilisateurConnecte);

      expect(modifierProfilUtilisateurUseCase.execute).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual(utilisateurModifie);
    });

    it("utilise systématiquement l'id de l'utilisateur connecté, même si un autre utilisateur est passé en paramètre implicite (aucune route ne permet de modifier le profil d'un tiers)", async () => {
      const { controller, modifierProfilUtilisateurUseCase } = makeController();
      const utilisateurConnecte = makeUtilisateur({ id: 'connecte-uniquement' });

      await controller.modifierMonProfil({ numeroLicence: '1' }, utilisateurConnecte);

      expect(modifierProfilUtilisateurUseCase.execute).toHaveBeenCalledWith(
        'connecte-uniquement',
        { numeroLicence: '1' },
      );
    });
  });
});
