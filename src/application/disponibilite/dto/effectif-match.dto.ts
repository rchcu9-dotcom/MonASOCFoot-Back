import {
  ActiviteColonneDto,
  DisponibiliteEffectiveDto,
} from "./disponibilite-effectif.dto";

export interface EffectifMatchBadgeDto {
  nbPresents: number;
  nbDisponibles: number;
  /** Arrondi, `0` si l'effectif est vide. */
  pourcentageSaisie: number;
}

export interface JoueurEffectifMatchDto {
  utilisateurId: string;
  displayName: string;
  /** Sur l'ensemble des matchs à venir, pas seulement le match courant. Arrondi, `0` si aucun match à venir. */
  pourcentageMatchsAVenirRenseignes: number;
  disponibiliteMatchCourant: DisponibiliteEffectiveDto;
}

export interface EffectifMatchResponseDto {
  /** `null` si aucun match à venir n'existe. */
  matchCourant: ActiviteColonneDto | null;
  matchPrecedentId: string | null;
  matchSuivantId: string | null;
  /** `null` si aucun match à venir n'existe. */
  badge: EffectifMatchBadgeDto | null;
  joueurs: JoueurEffectifMatchDto[];
}
