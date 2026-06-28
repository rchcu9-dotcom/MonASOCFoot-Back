import { Module } from "@nestjs/common";
import { ConsulterDisponibilitesEffectifUseCase } from "../../../application/disponibilite/use-cases/consulter-disponibilites-effectif.use-case";
import {
  DISPONIBILITE_ACTIVITE_REPOSITORY,
  DISPONIBILITE_JOURNEE_REPOSITORY,
} from "../../../domain/shared/tokens";
import { DisponibiliteActivitePrismaRepository } from "../../persistence/prisma/disponibilite-activite.prisma.repository";
import { DisponibiliteJourneePrismaRepository } from "../../persistence/prisma/disponibilite-journee.prisma.repository";
import { ActivitesModule } from "../activite/activites.module";
import { UsersModule } from "../users/users.module";
import { DisponibilitesController } from "./disponibilites.controller";

@Module({
  imports: [UsersModule, ActivitesModule],
  controllers: [DisponibilitesController],
  providers: [
    ConsulterDisponibilitesEffectifUseCase,
    {
      provide: DISPONIBILITE_JOURNEE_REPOSITORY,
      useClass: DisponibiliteJourneePrismaRepository,
    },
    {
      provide: DISPONIBILITE_ACTIVITE_REPOSITORY,
      useClass: DisponibiliteActivitePrismaRepository,
    },
  ],
  exports: [DISPONIBILITE_JOURNEE_REPOSITORY, DISPONIBILITE_ACTIVITE_REPOSITORY],
})
export class DisponibilitesModule {}
