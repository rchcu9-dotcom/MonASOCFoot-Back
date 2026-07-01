import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Activite } from "../../../domain/activite/entities/activite.entity";
import type { ActiviteRepository } from "../../../domain/activite/repositories/activite.repository.interface";
import { ACTIVITE_REPOSITORY } from "../../../domain/shared/tokens";
import { ModifierActiviteDto } from "../dto/modifier-activite.dto";

@Injectable()
export class ModifierActiviteUseCase {
  constructor(
    @Inject(ACTIVITE_REPOSITORY)
    private readonly activites: ActiviteRepository,
  ) {}

  async execute(id: string, dto: ModifierActiviteDto): Promise<Activite> {
    const existante = await this.activites.findById(id);
    if (!existante) {
      throw new NotFoundException(`Activité ${id} introuvable`);
    }

    const aucunChamp =
      dto.date === undefined &&
      dto.heureConvocation === undefined &&
      dto.heureDebut === undefined &&
      dto.label === undefined &&
      dto.type === undefined &&
      dto.commentaire === undefined &&
      dto.lieu === undefined &&
      dto.equipe === undefined;
    if (aucunChamp) {
      throw new BadRequestException("Aucun champ à modifier n'a été fourni");
    }

    const fusionnee: Activite = {
      ...existante,
      // `date`/`equipe` : tri-état — `undefined` = non modifié, `null` = retrait explicite
      // (ex. déplacement colonne droite → gauche), valeur = assignation.
      ...(dto.date !== undefined && { date: dto.date ?? undefined }),
      ...(dto.heureConvocation !== undefined && {
        heureConvocation: dto.heureConvocation,
      }),
      ...(dto.heureDebut !== undefined && { heureDebut: dto.heureDebut }),
      ...(dto.label !== undefined && { label: dto.label }),
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.commentaire !== undefined && { commentaire: dto.commentaire }),
      ...(dto.lieu !== undefined && { lieu: dto.lieu }),
      ...(dto.equipe !== undefined && { equipe: dto.equipe ?? undefined }),
    };

    if (fusionnee.heureDebut < fusionnee.heureConvocation) {
      throw new BadRequestException(
        "L'heure de début doit être postérieure ou égale à l'heure de convocation",
      );
    }

    return this.activites.save(fusionnee);
  }
}
