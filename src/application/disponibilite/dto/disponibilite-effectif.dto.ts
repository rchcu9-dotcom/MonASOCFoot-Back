import {
  EquipeClub,
  TypeActivite,
} from "../../../domain/activite/entities/activite.entity";
import { StatutDisponibilite } from "../../../domain/disponibilite/entities/statut-disponibilite.enum";

export interface DisponibiliteEffectiveDto {
  statut: StatutDisponibilite;
  commentaire?: string;
  source: "activite" | "journee" | "aucune";
}

export interface LigneJoueurDto {
  utilisateurId: string;
  displayName: string;
  /** Clé = `activiteId`. */
  disponibilites: Record<string, DisponibiliteEffectiveDto>;
}

/** Partagé par le résumé accueil (`resume-accueil.dto.ts`) et l'effectif par match (`effectif-match.dto.ts`). */
export interface ActiviteColonneDto {
  id: string;
  date: string;
  heureConvocation: string;
  heureDebut: string;
  label: string;
  type: TypeActivite;
  commentaire?: string;
  equipe?: EquipeClub;
}

export interface DisponibilitesEffectifResponseDto {
  activites: ActiviteColonneDto[];
  joueurs: LigneJoueurDto[];
}
