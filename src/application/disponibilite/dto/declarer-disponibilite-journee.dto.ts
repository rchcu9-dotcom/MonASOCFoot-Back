import { IsIn, IsOptional, IsString } from "class-validator";
import type { StatutDisponibilite } from "../../../domain/disponibilite/entities/statut-disponibilite.enum";

export class DeclarerDisponibiliteJourneeDto {
  @IsIn(["present", "disponible", "absent", "autre"])
  statut!: StatutDisponibilite;

  @IsOptional()
  @IsString()
  commentaire?: string;

  /** Admin uniquement : permet d'agir pour un autre utilisateur que soi-même. */
  @IsOptional()
  @IsString()
  utilisateurId?: string;
}
