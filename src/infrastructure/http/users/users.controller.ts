import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import { ModifierRoleUtilisateurDto } from "../../../application/utilisateur/dto/modifier-role-utilisateur.dto";
import {
  toUtilisateurDto,
  UtilisateurDto,
} from "../../../application/utilisateur/dto/utilisateur.dto";
import { ListerUtilisateursUseCase } from "../../../application/utilisateur/use-cases/lister-utilisateurs.use-case";
import { ModifierRoleUtilisateurUseCase } from "../../../application/utilisateur/use-cases/modifier-role-utilisateur.use-case";
import type { Utilisateur } from "../../../domain/utilisateur/entities/utilisateur.entity";
import { CurrentUser } from "../shared/current-user.decorator";
import { RequireAdmin } from "../shared/require-admin.decorator";

@Controller("users")
export class UsersController {
  constructor(
    private readonly listerUtilisateursUseCase: ListerUtilisateursUseCase,
    private readonly modifierRoleUtilisateurUseCase: ModifierRoleUtilisateurUseCase,
  ) {}

  @Get()
  @RequireAdmin()
  async findAll(): Promise<UtilisateurDto[]> {
    const utilisateurs = await this.listerUtilisateursUseCase.execute();
    return utilisateurs.map(toUtilisateurDto);
  }

  @Patch(":id/role")
  @RequireAdmin()
  async modifierRole(
    @Param("id") id: string,
    @Body() dto: ModifierRoleUtilisateurDto,
    @CurrentUser() utilisateurConnecte: Utilisateur,
  ): Promise<UtilisateurDto> {
    const utilisateur = await this.modifierRoleUtilisateurUseCase.execute(
      id,
      dto,
      utilisateurConnecte.id,
    );
    return toUtilisateurDto(utilisateur);
  }
}
