export type TypeActivite = "match" | "autre";

/**
 * `manuel` : créée via le CRUD admin (cette feature).
 * `import` : importée automatiquement depuis le site du district (cf. spec
 * `import-matchs-site-district`, hors périmètre — champ posé en anticipation).
 */
export type SourceActivite = "manuel" | "import";

/** Équipe du club concernée par l'activité (cf. spec planification). */
export type EquipeClub = "A" | "B" | "Vet";

export interface Activite {
  id: string;
  /**
   * ISO 8601 — format yyyy-mm-dd. `null`/absente pour une activité « sans date »
   * (cf. spec `pour-grer-les-activits-il-faut-pouvoir-bouger-lactivit-dune-`) : connue mais
   * pas encore planifiée, en attente d'assignation via l'interface de planification ou le
   * CRUD admin.
   */
  date?: string;
  /** Heure de convocation, format HH:mm. */
  heureConvocation: string;
  /** Heure de début effective de l'activité, format HH:mm. */
  heureDebut: string;
  label: string;
  type: TypeActivite;
  commentaire?: string;
  /** Lieu de l'activité (stade, salle…), absent si non renseigné. */
  lieu?: string;
  source: SourceActivite;
  /** Identifiant stable côté site du district — clé de dédup pour l'import automatique. Absent pour les activités saisies manuellement. */
  idExterne?: string;
  /** Équipe du club concernée (A/B/Vét), absente si non renseignée (ex. AG, barbecue). */
  equipe?: EquipeClub;
}
