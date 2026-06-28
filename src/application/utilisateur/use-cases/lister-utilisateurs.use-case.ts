import { Inject, Injectable } from "@nestjs/common";
import { Utilisateur } from "../../../domain/utilisateur/entities/utilisateur.entity";
import type { UtilisateurRepository } from "../../../domain/utilisateur/repositories/utilisateur.repository.interface";
import { UTILISATEUR_REPOSITORY } from "../../../domain/shared/tokens";

@Injectable()
export class ListerUtilisateursUseCase {
  constructor(
    @Inject(UTILISATEUR_REPOSITORY)
    private readonly utilisateurs: UtilisateurRepository,
  ) {}

  async execute(): Promise<Utilisateur[]> {
    return this.utilisateurs.findAll();
  }
}
