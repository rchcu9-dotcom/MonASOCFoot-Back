import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Activite } from "../../../domain/activite/entities/activite.entity";
import type { ActiviteRepository } from "../../../domain/activite/repositories/activite.repository.interface";
import { ACTIVITE_REPOSITORY } from "../../../domain/shared/tokens";
import { CreerActiviteDto } from "../dto/creer-activite.dto";

@Injectable()
export class CreerActiviteUseCase {
  constructor(
    @Inject(ACTIVITE_REPOSITORY)
    private readonly activites: ActiviteRepository,
  ) {}

  async execute(dto: CreerActiviteDto): Promise<Activite> {
    if (dto.heureDebut < dto.heureConvocation) {
      throw new BadRequestException(
        "L'heure de début doit être postérieure ou égale à l'heure de convocation",
      );
    }

    const activite: Activite = {
      id: randomUUID(),
      date: dto.date,
      heureConvocation: dto.heureConvocation,
      heureDebut: dto.heureDebut,
      label: dto.label,
      type: dto.type,
      commentaire: dto.commentaire,
      lieu: dto.lieu,
      source: "manuel",
      equipe: dto.equipe,
    };

    return this.activites.save(activite);
  }
}
