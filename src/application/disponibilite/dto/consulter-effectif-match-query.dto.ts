export interface ConsulterEffectifMatchQueryDto {
  /** Match à afficher. Absent (ou obsolète/introuvable parmi les matchs à venir) → le plus proche match à venir. */
  matchId?: string;
}
