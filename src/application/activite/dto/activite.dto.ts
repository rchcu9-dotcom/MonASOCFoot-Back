import {
  Activite,
  SourceActivite,
  TypeActivite,
} from "../../../domain/activite/entities/activite.entity";

export interface ActiviteDto {
  id: string;
  date: string;
  heureConvocation: string;
  heureDebut: string;
  label: string;
  type: TypeActivite;
  commentaire?: string;
  source: SourceActivite;
}

export function toActiviteDto(activite: Activite): ActiviteDto {
  return { ...activite };
}
