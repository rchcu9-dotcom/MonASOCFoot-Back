import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { ActiviteRepository } from "../../../domain/activite/repositories/activite.repository.interface";
import { ACTIVITE_REPOSITORY } from "../../../domain/shared/tokens";

@Injectable()
export class SupprimerActiviteUseCase {
  constructor(
    @Inject(ACTIVITE_REPOSITORY)
    private readonly activites: ActiviteRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const existante = await this.activites.findById(id);
    if (!existante) {
      throw new NotFoundException(`Activité ${id} introuvable`);
    }
    await this.activites.deleteById(id);
  }
}
