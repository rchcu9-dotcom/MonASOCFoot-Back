import { Controller, Get, Query } from "@nestjs/common";
import { ConsulterDisponibilitesEffectifUseCase } from "../../../application/disponibilite/use-cases/consulter-disponibilites-effectif.use-case";
import { DisponibilitesEffectifResponseDto } from "../../../application/disponibilite/dto/disponibilite-effectif.dto";
import { RequireAuth } from "../shared/require-auth.decorator";

@Controller("disponibilites")
export class DisponibilitesController {
  constructor(
    private readonly consulterDisponibilitesEffectifUseCase: ConsulterDisponibilitesEffectifUseCase,
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
}
