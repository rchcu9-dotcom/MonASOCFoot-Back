import { Module } from "@nestjs/common";
import { ListerUtilisateursUseCase } from "../../../application/utilisateur/use-cases/lister-utilisateurs.use-case";
import { ModifierProfilUtilisateurUseCase } from "../../../application/utilisateur/use-cases/modifier-profil-utilisateur.use-case";
import { ModifierRoleUtilisateurUseCase } from "../../../application/utilisateur/use-cases/modifier-role-utilisateur.use-case";
import { UTILISATEUR_REPOSITORY } from "../../../domain/shared/tokens";
import { UtilisateurPrismaRepository } from "../../persistence/prisma/utilisateur.prisma.repository";
import { UsersController } from "./users.controller";

@Module({
  controllers: [UsersController],
  providers: [
    ListerUtilisateursUseCase,
    ModifierRoleUtilisateurUseCase,
    ModifierProfilUtilisateurUseCase,
    { provide: UTILISATEUR_REPOSITORY, useClass: UtilisateurPrismaRepository },
  ],
  exports: [UTILISATEUR_REPOSITORY],
})
export class UsersModule {}
