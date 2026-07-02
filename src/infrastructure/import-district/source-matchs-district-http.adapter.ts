import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type {
  MatchDistrictBrut,
  SourceMatchsDistrictPort,
} from "../../domain/activite/ports/source-matchs-district.port";

/**
 * Implémentation concrète du port `SourceMatchsDistrictPort`.
 *
 * **Stub volontaire** : l'URL du site du district (`DISTRICT_SOURCE_URL`) et son format de
 * données (API JSON publique vs scraping HTML) n'ont pas encore été communiqués par Lionel
 * (cf. spec `import-matchs-site-district`, `decisions.json`). Tant que ces informations ne sont
 * pas connues, cet adaptateur échoue explicitement plutôt que d'improviser une intégration sur
 * une hypothèse non confirmée. Le contrat (`SourceMatchsDistrictPort`) et tout le reste du
 * système (use case, dédup, persistance, endpoint, front) sont en revanche pleinement
 * implémentés et fonctionnels dès que cette unique classe sera complétée.
 *
 * À l'implémentation réelle :
 * - lire `DISTRICT_SOURCE_URL` (et tout secret/clé d'API additionnel si nécessaire) ;
 * - appeler la source (fetch JSON ou scraping HTML selon ce que confirmera Lionel) ;
 * - mapper chaque match brut vers `MatchDistrictBrut`, en synthétisant `idExterne` de façon
 *   déterministe si la source n'expose pas d'identifiant stable.
 */
@Injectable()
export class SourceMatchsDistrictHttpAdapter implements SourceMatchsDistrictPort {
  recupererMatchsAVenir(): Promise<MatchDistrictBrut[]> {
    const url = process.env.DISTRICT_SOURCE_URL;
    if (!url) {
      return Promise.reject(
        new ServiceUnavailableException(
          "Import indisponible : DISTRICT_SOURCE_URL n'est pas configurée (URL/structure du site du district pas encore communiquées par Lionel)",
        ),
      );
    }

    return Promise.reject(
      new ServiceUnavailableException(
        "Import indisponible : la logique de récupération/parsing du site du district reste à implémenter une fois son format confirmé",
      ),
    );
  }
}
