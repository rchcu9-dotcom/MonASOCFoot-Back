import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Utilisateur } from "../../../domain/utilisateur/entities/utilisateur.entity";
import type { UtilisateurRepository } from "../../../domain/utilisateur/repositories/utilisateur.repository.interface";
import { UTILISATEUR_REPOSITORY } from "../../../domain/shared/tokens";
import { ModifierRoleUtilisateurDto } from "../dto/modifier-role-utilisateur.dto";

@Injectable()
export class ModifierRoleUtilisateurUseCase {
  constructor(
    @Inject(UTILISATEUR_REPOSITORY)
    private readonly utilisateurs: UtilisateurRepository,
  ) {}

  async execute(
    id: string,
    dto: ModifierRoleUtilisateurDto,
    idUtilisateurConnecte: string,
  ): Promise<Utilisateur> {
    const utilisateur = await this.utilisateurs.findById(id);
    if (!utilisateur) {
      throw new NotFoundException(`Utilisateur ${id} introuvable`);
    }

    if (id === idUtilisateurConnecte && dto.role === "joueur") {
      throw new BadRequestException(
        "Un admin ne peut pas retirer son propre rôle admin",
      );
    }

    return this.utilisateurs.updateRole(id, dto.role);
  }
}
