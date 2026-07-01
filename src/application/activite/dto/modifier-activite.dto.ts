import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
} from "class-validator";
import type {
  EquipeClub,
  TypeActivite,
} from "../../../domain/activite/entities/activite.entity";

/**
 * DTO de modification partielle, tri-état sur `date` et `equipe` :
 * - champ absent du payload (`undefined`) → non modifié ;
 * - champ présent avec valeur `null` → retrait explicite (ex. déplacement colonne droite →
 *   gauche pour `date`, ou suppression de l'équipe assignée) ;
 * - champ présent avec une valeur → assignation.
 * `@ValidateIf` (plutôt qu'un simple retrait de `@IsNotEmpty()`) permet de valider la valeur
 * quand elle est fournie tout en acceptant explicitement `null`.
 */
export class ModifierActiviteDto {
  /** ISO 8601 — format yyyy-mm-dd. `null` = retrait explicite de la date. */
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsNotEmpty()
  date?: string | null;

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

  @IsOptional()
  @IsString()
  lieu?: string;

  /** `null` = retrait explicite de l'équipe assignée. */
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsIn(["A", "B", "Vet"])
  equipe?: EquipeClub | null;
}
