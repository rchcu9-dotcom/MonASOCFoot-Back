import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
  Query,
} from "@nestjs/common";
import { DeclarerDisponibiliteActiviteDto } from "../../../application/disponibilite/dto/declarer-disponibilite-activite.dto";
import {
  DisponibiliteActiviteDto,
  toDisponibiliteActiviteDto,
} from "../../../application/disponibilite/dto/disponibilite-activite.dto";
import { DeclarerDisponibiliteJourneeDto } from "../../../application/disponibilite/dto/declarer-disponibilite-journee.dto";
import { DisponibilitesEffectifResponseDto } from "../../../application/disponibilite/dto/disponibilite-effectif.dto";
import {
  DisponibiliteJourneeDto,
  toDisponibiliteJourneeDto,
} from "../../../application/disponibilite/dto/disponibilite-journee.dto";
import { ConsulterDisponibilitesEffectifUseCase } from "../../../application/disponibilite/use-cases/consulter-disponibilites-effectif.use-case";
import { DeclarerDisponibiliteActiviteUseCase } from "../../../application/disponibilite/use-cases/declarer-disponibilite-activite.use-case";
import { DeclarerDisponibiliteJourneeUseCase } from "../../../application/disponibilite/use-cases/declarer-disponibilite-journee.use-case";
import { ListerMesDisponibilitesJourneeUseCase } from "../../../application/disponibilite/use-cases/lister-mes-disponibilites-journee.use-case";
import { SupprimerDisponibiliteActiviteUseCase } from "../../../application/disponibilite/use-cases/supprimer-disponibilite-activite.use-case";
import type { Utilisateur } from "../../../domain/utilisateur/entities/utilisateur.entity";
import { CurrentUser } from "../shared/current-user.decorator";
import { RequireAuth } from "../shared/require-auth.decorator";

@Controller("disponibilites")
export class DisponibilitesController {
  constructor(
    private readonly consulterDisponibilitesEffectifUseCase: ConsulterDisponibilitesEffectifUseCase,
    private readonly declarerDisponibiliteActiviteUseCase: DeclarerDisponibiliteActiviteUseCase,
    private readonly supprimerDisponibiliteActiviteUseCase: SupprimerDisponibiliteActiviteUseCase,
    private readonly declarerDisponibiliteJourneeUseCase: DeclarerDisponibiliteJourneeUseCase,
    private readonly listerMesDisponibilitesJourneeUseCase: ListerMesDisponibilitesJourneeUseCase,
  ) {}

  @Get("effectif")
  @RequireAuth()
  async getEffectif(
    @Query("date") date?: string,
    @Query("activiteId") activiteId?: string,
  ): Promise<DisponibilitesEffectifResponseDto> {
    return this.consulterDisponibilitesEffectifUseCase.execute({
      date,
      activiteId,
    });
  }

  @Put("activite/:activiteId")
  @RequireAuth()
  async declarerDisponibiliteActivite(
    @Param("activiteId") activiteId: string,
    @Body() dto: DeclarerDisponibiliteActiviteDto,
    @CurrentUser() utilisateurConnecte: Utilisateur,
  ): Promise<DisponibiliteActiviteDto> {
    const disponibilite = await this.declarerDisponibiliteActiviteUseCase.execute(
      activiteId,
      dto,
      utilisateurConnecte,
    );
    return toDisponibiliteActiviteDto(disponibilite);
  }

  @Delete("activite/:activiteId")
  @RequireAuth()
  @HttpCode(204)
  async supprimerDisponibiliteActivite(
    @Param("activiteId") activiteId: string,
    @Query("utilisateurId") utilisateurId: string | undefined,
    @CurrentUser() utilisateurConnecte: Utilisateur,
  ): Promise<void> {
    await this.supprimerDisponibiliteActiviteUseCase.execute(
      activiteId,
      utilisateurId,
      utilisateurConnecte,
    );
  }

  @Get("journee/mes-disponibilites")
  @RequireAuth()
  async listerMesDisponibilitesJournee(
    @CurrentUser() utilisateurConnecte: Utilisateur,
  ): Promise<DisponibiliteJourneeDto[]> {
    const disponibilites = await this.listerMesDisponibilitesJourneeUseCase.execute(
      utilisateurConnecte,
    );
    return disponibilites.map(toDisponibiliteJourneeDto);
  }

  @Put("journee/:date")
  @RequireAuth()
  async declarerDisponibiliteJournee(
    @Param("date") date: string,
    @Body() dto: DeclarerDisponibiliteJourneeDto,
    @CurrentUser() utilisateurConnecte: Utilisateur,
  ): Promise<DisponibiliteJourneeDto> {
    const disponibilite = await this.declarerDisponibiliteJourneeUseCase.execute(
      date,
      dto,
      utilisateurConnecte,
    );
    return toDisponibiliteJourneeDto(disponibilite);
  }
}
