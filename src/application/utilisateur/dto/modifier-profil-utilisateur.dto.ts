import {
  IsDateString,
  IsOptional,
  IsString,
  ValidateIf,
} from "class-validator";

export class ModifierProfilUtilisateurDto {
  // `@IsOptional()` ne dispense de validation que pour `undefined`/`null`, pas pour une chaîne
  // vide — or une chaîne vide est le moyen pour l'utilisateur de vider le champ (cf.
  // `UtilisateurRepository.updateProfil`). `@ValidateIf` laisse donc passer '' sans la
  // confronter à `@IsDateString()`, tout en validant le format dès qu'une valeur est fournie.
  @ValidateIf((dto: ModifierProfilUtilisateurDto) => !!dto.dateNaissance)
  @IsDateString()
  dateNaissance?: string;

  @IsOptional()
  @IsString()
  numeroLicence?: string;
}
