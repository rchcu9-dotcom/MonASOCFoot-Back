import { IsIn, IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";
import type { TypeActivite } from "../../../domain/activite/entities/activite.entity";

export class CreerActiviteDto {
  /** ISO 8601 — format yyyy-mm-dd. */
  @IsNotEmpty()
  date!: string;

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
}
