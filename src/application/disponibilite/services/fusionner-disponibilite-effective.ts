import { DisponibiliteActivite } from "../../../domain/disponibilite/entities/disponibilite-activite.entity";
import { DisponibiliteJournee } from "../../../domain/disponibilite/entities/disponibilite-journee.entity";
import { DisponibiliteEffectiveDto } from "../dto/disponibilite-effectif.dto";

/**
 * Règle de fusion journée/activité : la surcharge d'activité prime sur la disponibilité de
 * journée, elle-même prime sur l'absence de déclaration. Fonction pure, réutilisée par tout
 * use case ayant besoin de résoudre une disponibilité effective (effectif complet, résumé
 * Accueil, ...).
 */
export function fusionnerDisponibiliteEffective(
  surchargeActivite: DisponibiliteActivite | undefined,
  dispoJournee: DisponibiliteJournee | undefined,
): DisponibiliteEffectiveDto {
  if (surchargeActivite) {
    return {
      statut: surchargeActivite.statut,
      commentaire: surchargeActivite.commentaire,
      source: "activite",
    };
  }

  if (dispoJournee) {
    return {
      statut: dispoJournee.statut,
      commentaire: dispoJournee.commentaire,
      source: "journee",
    };
  }

  return { statut: "autre", source: "aucune" };
}
