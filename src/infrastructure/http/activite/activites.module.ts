import { Module } from "@nestjs/common";
import { ConsulterPlanificationActivitesUseCase } from "../../../application/activite/use-cases/consulter-planification-activites.use-case";
import { CreerActiviteUseCase } from "../../../application/activite/use-cases/creer-activite.use-case";
import { ImporterMatchsDistrictUseCase } from "../../../application/activite/use-cases/importer-matchs-district.use-case";
import { ListerActivitesUseCase } from "../../../application/activite/use-cases/lister-activites.use-case";
import { ModifierActiviteUseCase } from "../../../application/activite/use-cases/modifier-activite.use-case";
import { SupprimerActiviteUseCase } from "../../../application/activite/use-cases/supprimer-activite.use-case";
import {
  ACTIVITE_REPOSITORY,
  SOURCE_MATCHS_DISTRICT,
} from "../../../domain/shared/tokens";
import { SourceMatchsDistrictHttpAdapter } from "../../import-district/source-matchs-district-http.adapter";
import { ActivitePrismaRepository } from "../../persistence/prisma/activite.prisma.repository";
import { ActivitesController } from "./activites.controller";

@Module({
  controllers: [ActivitesController],
  providers: [
    ListerActivitesUseCase,
    CreerActiviteUseCase,
    ModifierActiviteUseCase,
    SupprimerActiviteUseCase,
    ImporterMatchsDistrictUseCase,
    ConsulterPlanificationActivitesUseCase,
    { provide: ACTIVITE_REPOSITORY, useClass: ActivitePrismaRepository },
    {
      provide: SOURCE_MATCHS_DISTRICT,
      useClass: SourceMatchsDistrictHttpAdapter,
    },
  ],
  exports: [ACTIVITE_REPOSITORY],
})
export class ActivitesModule {}
