import { Inject, Injectable } from "@nestjs/common";
import { Activite } from "../../../domain/activite/entities/activite.entity";
import type { ActiviteRepository } from "../../../domain/activite/repositories/activite.repository.interface";
import { ACTIVITE_REPOSITORY } from "../../../domain/shared/tokens";

/**
 * Liste **toutes** les activités, passées incluses — à la différence de
 * `findUpcoming()` (utilisé par la consultation effectif), l'admin doit
 * pouvoir consulter/corriger l'historique.
 */
@Injectable()
export class ListerActivitesUseCase {
  constructor(
    @Inject(ACTIVITE_REPOSITORY)
    private readonly activites: ActiviteRepository,
  ) {}

  async execute(): Promise<Activite[]> {
    return this.activites.findAll();
  }
}
