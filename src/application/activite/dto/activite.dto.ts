import {
  Activite,
  EquipeClub,
  SourceActivite,
  TypeActivite,
} from "../../../domain/activite/entities/activite.entity";

export interface ActiviteDto {
  id: string;
  /** Absente pour une activité « sans date ». */
  date?: string;
  heureConvocation: string;
  heureDebut: string;
  label: string;
  type: TypeActivite;
  commentaire?: string;
  lieu?: string;
  source: SourceActivite;
  equipe?: EquipeClub;
}

export function toActiviteDto(activite: Activite): ActiviteDto {
  return { ...activite };
}
