import { DisponibiliteJournee } from "../../../domain/disponibilite/entities/disponibilite-journee.entity";

export interface DisponibiliteJourneeDto {
  id: string;
  utilisateurId: string;
  date: string;
  statut: DisponibiliteJournee["statut"];
  commentaire?: string;
}

export function toDisponibiliteJourneeDto(
  disponibilite: DisponibiliteJournee,
): DisponibiliteJourneeDto {
  return { ...disponibilite };
}
