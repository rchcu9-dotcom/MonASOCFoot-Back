import { IsIn, IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";
import type { TypeActivite } from "../../../domain/activite/entities/activite.entity";

export class ModifierActiviteDto {
  /** ISO 8601 — format yyyy-mm-dd. */
  @IsOptional()
  @IsNotEmpty()
  date?: string;

  /** Format HH:mm. */
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  heureConvocation?: string;

  /** Format HH:mm. */
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  heureDebut?: string;

  @IsOptional()
  @IsNotEmpty()
  label?: string;

  @IsOptional()
  @IsIn(["match", "autre"])
  type?: TypeActivite;

  @IsOptional()
  @IsString()
  commentaire?: string;
}
