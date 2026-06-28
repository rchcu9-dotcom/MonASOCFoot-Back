export type TypeActivite = "match" | "autre";

/**
 * `manuel` : créée via le CRUD admin (cette feature).
 * `import` : importée automatiquement depuis le site du district (cf. spec
 * `import-matchs-site-district`, hors périmètre — champ posé en anticipation).
 */
export type SourceActivite = "manuel" | "import";

export interface Activite {
  id: string;
  /** ISO 8601 — format yyyy-mm-dd. */
  date: string;
  /** Heure de convocation, format HH:mm. */
  heureConvocation: string;
  /** Heure de début effective de l'activité, format HH:mm. */
  heureDebut: string;
  label: string;
  type: TypeActivite;
  commentaire?: string;
  source: SourceActivite;
  /** Identifiant stable côté site du district — clé de dédup pour l'import automatique. Absent pour les activités saisies manuellement. */
  idExterne?: string;
}
