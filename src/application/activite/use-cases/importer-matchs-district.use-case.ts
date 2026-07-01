import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Activite } from "../../../domain/activite/entities/activite.entity";
import type {
  MatchDistrictBrut,
  SourceMatchsDistrictPort,
} from "../../../domain/activite/ports/source-matchs-district.port";
import type { ActiviteRepository } from "../../../domain/activite/repositories/activite.repository.interface";
import {
  ACTIVITE_REPOSITORY,
  SOURCE_MATCHS_DISTRICT,
} from "../../../domain/shared/tokens";
import { ImportMatchsResultatDto } from "../dto/import-matchs-resultat.dto";

/**
 * Orchestration de l'import automatique des matchs du site du district (cf. spec
 * `import-matchs-site-district`). Règle de dédup à deux niveaux :
 * 1. `idExterne` (déjà importé précédemment) → mise à jour.
 * 2. À défaut, une activité `manuel` existante à la même date pour un match → "réclamée"
 *    (idExterne lui est assigné) sans écraser ses autres champs, pour ne jamais effacer une
 *    saisie admin et ne pas créer de doublon.
 * 3. Sinon → création, source `import`.
 *
 * Chaque match du lot est traité indépendamment : l'échec de l'un n'empêche pas le traitement
 * des suivants (erreurs agrégées dans `erreurs[]`).
 */
@Injectable()
export class ImporterMatchsDistrictUseCase {
  constructor(
    @Inject(SOURCE_MATCHS_DISTRICT)
    private readonly source: SourceMatchsDistrictPort,
    @Inject(ACTIVITE_REPOSITORY)
    private readonly activites: ActiviteRepository,
  ) {}

  async execute(): Promise<ImportMatchsResultatDto> {
    const matchs = await this.source.recupererMatchsAVenir();

    const resultat: ImportMatchsResultatDto = {
      matchsRecuperes: matchs.length,
      crees: 0,
      misAJour: 0,
      ignores: 0,
      erreurs: [],
    };

    for (const match of matchs) {
      try {
        await this.traiterMatch(match, resultat);
      } catch (erreur) {
        const message =
          erreur instanceof Error ? erreur.message : String(erreur);
        resultat.erreurs.push(`Match ${match.idExterne}: ${message}`);
      }
    }

    return resultat;
  }

  private async traiterMatch(
    match: MatchDistrictBrut,
    resultat: ImportMatchsResultatDto,
  ): Promise<void> {
    const dejaImporte = await this.activites.findByIdExterne(match.idExterne);
    if (dejaImporte) {
      await this.activites.save({
        ...dejaImporte,
        date: match.date,
        heureDebut: match.heureDebut,
        heureConvocation:
          match.heureConvocation ?? dejaImporte.heureConvocation,
        label: match.label,
        commentaire: match.complement ?? dejaImporte.commentaire,
      });
      resultat.misAJour += 1;
      return;
    }

    const manuelleCorrespondante =
      await this.trouverActiviteManuelleCorrespondante(match);
    if (manuelleCorrespondante) {
      await this.activites.save({
        ...manuelleCorrespondante,
        idExterne: match.idExterne,
      });
      resultat.ignores += 1;
      return;
    }

    const nouvelleActivite: Activite = {
      id: randomUUID(),
      date: match.date,
      heureDebut: match.heureDebut,
      heureConvocation: match.heureConvocation ?? match.heureDebut,
      label: match.label,
      type: "match",
      commentaire: match.complement,
      source: "import",
      idExterne: match.idExterne,
    };
    await this.activites.save(nouvelleActivite);
    resultat.crees += 1;
  }

  private async trouverActiviteManuelleCorrespondante(
    match: MatchDistrictBrut,
  ): Promise<Activite | null> {
    const toutesLesActivites = await this.activites.findAll();
    return (
      toutesLesActivites.find(
        (activite) =>
          activite.source === "manuel" &&
          activite.type === "match" &&
          activite.date === match.date &&
          !activite.idExterne,
      ) ?? null
    );
  }
}
