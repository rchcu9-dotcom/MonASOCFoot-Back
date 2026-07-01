import {
  ActiviteColonneDto,
  DisponibiliteEffectiveDto,
} from "./disponibilite-effectif.dto";

export interface ActiviteAvecDisponibiliteDto {
  activite: ActiviteColonneDto;
  disponibilite: DisponibiliteEffectiveDto;
}

export interface ProchaineDateAccueilDto {
  date: string;
  activites: ActiviteAvecDisponibiliteDto[];
}

export interface TableauDeBordAccueilDto {
  totalAVenir: number;
  renseigneesAVenir: number;
  /** Arrondi, `0` si `totalAVenir` est nul. */
  pourcentageRenseignement: number;
}

export interface ResumeAccueilDto {
  dernierePassee: ActiviteAvecDisponibiliteDto | null;
  /** 0 à 3 entrées, triées par date croissante. */
  prochainesDates: ProchaineDateAccueilDto[];
  tableauDeBord: TableauDeBordAccueilDto;
}
