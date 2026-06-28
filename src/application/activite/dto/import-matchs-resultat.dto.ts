export interface ImportMatchsResultatDto {
  matchsRecuperes: number;
  crees: number;
  misAJour: number;
  ignores: number;
  /** Un message par match dont le traitement a échoué individuellement (best-effort, n'interrompt pas le reste du lot). */
  erreurs: string[];
}
