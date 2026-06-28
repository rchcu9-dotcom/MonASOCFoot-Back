import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import {
  ActiviteDto,
  toActiviteDto,
} from "../../../application/activite/dto/activite.dto";
import { CreerActiviteDto } from "../../../application/activite/dto/creer-activite.dto";
import { ImportMatchsResultatDto } from "../../../application/activite/dto/import-matchs-resultat.dto";
import { ModifierActiviteDto } from "../../../application/activite/dto/modifier-activite.dto";
import { CreerActiviteUseCase } from "../../../application/activite/use-cases/creer-activite.use-case";
import { ImporterMatchsDistrictUseCase } from "../../../application/activite/use-cases/importer-matchs-district.use-case";
import { ListerActivitesUseCase } from "../../../application/activite/use-cases/lister-activites.use-case";
import { ModifierActiviteUseCase } from "../../../application/activite/use-cases/modifier-activite.use-case";
import { SupprimerActiviteUseCase } from "../../../application/activite/use-cases/supprimer-activite.use-case";
import { RequireAdmin } from "../shared/require-admin.decorator";
import { RequireAuth } from "../shared/require-auth.decorator";

@Controller("activites")
export class ActivitesController {
  constructor(
    private readonly listerActivitesUseCase: ListerActivitesUseCase,
    private readonly creerActiviteUseCase: CreerActiviteUseCase,
    private readonly modifierActiviteUseCase: ModifierActiviteUseCase,
    private readonly supprimerActiviteUseCase: SupprimerActiviteUseCase,
    private readonly importerMatchsDistrictUseCase: ImporterMatchsDistrictUseCase,
  ) {}

  @Get()
  @RequireAuth()
  async findAll(): Promise<ActiviteDto[]> {
    const activites = await this.listerActivitesUseCase.execute();
    return activites.map(toActiviteDto);
  }

  @Post()
  @RequireAdmin()
  async create(@Body() dto: CreerActiviteDto): Promise<ActiviteDto> {
    const activite = await this.creerActiviteUseCase.execute(dto);
    return toActiviteDto(activite);
  }

  @Patch(":id")
  @RequireAdmin()
  async update(
    @Param("id") id: string,
    @Body() dto: ModifierActiviteDto,
  ): Promise<ActiviteDto> {
    const activite = await this.modifierActiviteUseCase.execute(id, dto);
    return toActiviteDto(activite);
  }

  @Delete(":id")
  @RequireAdmin()
  @HttpCode(204)
  async remove(@Param("id") id: string): Promise<void> {
    await this.supprimerActiviteUseCase.execute(id);
  }

  @Post("import-district")
  @RequireAdmin()
  async importerDistrict(): Promise<ImportMatchsResultatDto> {
    return this.importerMatchsDistrictUseCase.execute();
  }
}
