import { StatutDisponibilite } from "./statut-disponibilite.enum";

export interface DisponibiliteActivite {
  id: string;
  utilisateurId: string;
  activiteId: string;
  statut: StatutDisponibilite;
  commentaire?: string;
}
