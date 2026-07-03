import { BadRequestException } from "@nestjs/common";
import { ModifierProfilUtilisateurUseCase } from "./modifier-profil-utilisateur.use-case";
import type { Utilisateur } from "../../../domain/utilisateur/entities/utilisateur.entity";
import type { UtilisateurRepository } from "../../../domain/utilisateur/repositories/utilisateur.repository.interface";
import type { ModifierProfilUtilisateurDto } from "../dto/modifier-profil-utilisateur.dto";

function makeUtilisateur(overrides: Partial<Utilisateur> = {}): Utilisateur {
  return {
    id: "user-1",
    providerId: "provider-1",
    provider: "google",
    displayName: "Joueur Un",
    role: "joueur",
    dateApparition: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeUseCase(overrides: Partial<UtilisateurRepository> = {}) {
  const utilisateurRepository = {
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(makeUtilisateur()),
    save: jest.fn(),
    findByProviderId: jest.fn().mockResolvedValue(null),
    updateRole: jest.fn(),
    updateProfil: jest.fn(
      (id: string, profil: { dateNaissance?: string; numeroLicence?: string }) =>
        Promise.resolve(makeUtilisateur({ id, ...profil })),
    ),
    ...overrides,
  } as unknown as UtilisateurRepository;

  return {
    useCase: new ModifierProfilUtilisateurUseCase(utilisateurRepository),
    utilisateurRepository,
  };
}

describe("ModifierProfilUtilisateurUseCase", () => {
  it("enregistre dateNaissance et numeroLicence pour l'utilisateur connecté", async () => {
    const { useCase, utilisateurRepository } = makeUseCase();
    const dto: ModifierProfilUtilisateurDto = {
      dateNaissance: "1990-05-12",
      numeroLicence: "12345678",
    };

    const result = await useCase.execute("user-1", dto);

    expect(utilisateurRepository.updateProfil).toHaveBeenCalledWith("user-1", {
      dateNaissance: "1990-05-12",
      numeroLicence: "12345678",
    });
    expect(result.dateNaissance).toBe("1990-05-12");
    expect(result.numeroLicence).toBe("12345678");
  });

  it("accepte un DTO avec les deux champs absents (optionnels, aucune contrainte de complétude)", async () => {
    const { useCase, utilisateurRepository } = makeUseCase();

    await useCase.execute("user-1", {});

    expect(utilisateurRepository.updateProfil).toHaveBeenCalledWith("user-1", {
      dateNaissance: undefined,
      numeroLicence: undefined,
    });
  });

  it("accepte une date de naissance égale à aujourd'hui (limite acceptée, pas dans le futur)", async () => {
    const aujourdHui = new Date().toISOString().slice(0, 10);
    const { useCase, utilisateurRepository } = makeUseCase();

    await useCase.execute("user-1", { dateNaissance: aujourdHui });

    expect(utilisateurRepository.updateProfil).toHaveBeenCalledWith("user-1", {
      dateNaissance: aujourdHui,
      numeroLicence: undefined,
    });
  });

  it("rejette (400) une date de naissance dans le futur, sans appeler updateProfil", async () => {
    const demain = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { useCase, utilisateurRepository } = makeUseCase();

    await expect(useCase.execute("user-1", { dateNaissance: demain })).rejects.toThrow(
      BadRequestException,
    );
    expect(utilisateurRepository.updateProfil).not.toHaveBeenCalled();
  });

  it("n'accepte que l'id de l'utilisateur connecté : le use case ne prend aucun id de cible distinct", () => {
    // Défense en profondeur pour le critère d'acceptation « on ne modifie que son propre profil » :
    // la signature ne compte que deux paramètres (id connecté, dto), jamais un id de cible séparé.
    expect(ModifierProfilUtilisateurUseCase.prototype.execute.length).toBe(2);
  });

  it("renvoie l'utilisateur tel que renvoyé par le repository", async () => {
    const utilisateurMisAJour = makeUtilisateur({ id: "user-1", numeroLicence: "999" });
    const { useCase } = makeUseCase({
      updateProfil: jest.fn().mockResolvedValue(utilisateurMisAJour),
    });

    const result = await useCase.execute("user-1", { numeroLicence: "999" });

    expect(result).toBe(utilisateurMisAJour);
  });
});
