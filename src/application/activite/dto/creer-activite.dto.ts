import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from "class-validator";
import type {
  EquipeClub,
  TypeActivite,
} from "../../../domain/activite/entities/activite.entity";

export class CreerActiviteDto {
  /**
   * ISO 8601 — format yyyy-mm-dd. Optionnel : une activité peut être créée sans date
   * (« connue mais pas encore datée »), à assigner plus tard via l'interface de planification
   * ou le CRUD.
   */
  @IsOptional()
  @IsNotEmpty()
  date?: string;

  /** Format HH:mm. */
  @Matches(/^\d{2}:\d{2}$/)
  heureConvocation!: string;

  /** Format HH:mm. */
  @Matches(/^\d{2}:\d{2}$/)
  heureDebut!: string;

  @IsNotEmpty()
  label!: string;

  @IsIn(["match", "autre"])
  type!: TypeActivite;

  @IsOptional()
  @IsString()
  commentaire?: string;

  @IsOptional()
  @IsString()
  lieu?: string;

  @IsOptional()
  @IsIn(["A", "B", "Vet"])
  equipe?: EquipeClub;
}
