export interface MatchDistrictBrut {
  /**
   * Identifiant stable côté source (clé primaire de dédup, cf. `ActiviteRepository.findByIdExterne`).
   * Si la source ne fournit pas d'identifiant exploitable, l'adaptateur DOIT en synthétiser un
   * déterministe (ex. hash date+équipes) — ce n'est jamais à la charge de l'use case appelant.
   */
  idExterne: string;
  /** ISO 8601 — format yyyy-mm-dd. */
  date: string;
  /** Format HH:mm. Heure de coup d'envoi. */
  heureDebut: string;
  /** Format HH:mm. Absente si la source ne distingue pas convocation et coup d'envoi. */
  heureConvocation?: string;
  /** Libellé prêt à afficher, ex. "AS Orange Cesson Football vs Adversaire". */
  label: string;
  /** Texte libre optionnel (compétition, lieu...) — mappé tel quel dans `Activite.commentaire`. */
  complement?: string;
}

/**
 * Port hexagonal : isole l'accès à la source externe (site du district) du reste du système.
 * L'implémentation concrète (cf. `infrastructure/import-district/`) dépend d'une URL et d'un
 * format de données non encore communiqués par Lionel — cf. spec `import-matchs-site-district`.
 */
export interface SourceMatchsDistrictPort {
  recupererMatchsAVenir(): Promise<MatchDistrictBrut[]>;
}
