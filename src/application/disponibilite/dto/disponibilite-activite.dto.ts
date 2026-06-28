import { DisponibiliteActivite } from "../../../domain/disponibilite/entities/disponibilite-activite.entity";

export interface DisponibiliteActiviteDto {
  id: string;
  utilisateurId: string;
  activiteId: string;
  statut: DisponibiliteActivite["statut"];
  commentaire?: string;
}

export function toDisponibiliteActiviteDto(
  disponibilite: DisponibiliteActivite,
): DisponibiliteActiviteDto {
  return { ...disponibilite };
}
