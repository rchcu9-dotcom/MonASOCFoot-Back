import { NotFoundException } from '@nestjs/common';
import { SupprimerActiviteUseCase } from './supprimer-activite.use-case';
import type { Activite } from '../../../domain/activite/entities/activite.entity';
import type { ActiviteRepository } from '../../../domain/activite/repositories/activite.repository.interface';

function makeActivite(overrides: Partial<Activite> = {}): Activite {
  return {
    id: 'activite-1',
    date: '2026-07-01',
    heureConvocation: '14:00',
    heureDebut: '15:00',
    label: 'Match amical',
    type: 'match',
    source: 'manuel',
    ...overrides,
  };
}

function makeUseCase(overrides: Partial<ActiviteRepository> = {}) {
  const activiteRepository = {
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(makeActivite()),
    save: jest.fn(),
    findUpcoming: jest.fn().mockResolvedValue([]),
    deleteById: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as ActiviteRepository;

  return { useCase: new SupprimerActiviteUseCase(activiteRepository), activiteRepository };
}

describe('SupprimerActiviteUseCase', () => {
  it("lève NotFoundException quand l'activité n'existe pas, sans appeler deleteById", async () => {
    const { useCase, activiteRepository } = makeUseCase({ findById: jest.fn().mockResolvedValue(null) });

    await expect(useCase.execute('inconnue')).rejects.toThrow(NotFoundException);
    expect(activiteRepository.deleteById).not.toHaveBeenCalled();
  });

  it('appelle deleteById avec l\'id quand l\'activité existe', async () => {
    const { useCase, activiteRepository } = makeUseCase();

    await useCase.execute('activite-1');

    expect(activiteRepository.deleteById).toHaveBeenCalledWith('activite-1');
  });

  it("vérifie l'existence avant de supprimer (findById appelé avant deleteById)", async () => {
    const appels: string[] = [];
    const { useCase } = makeUseCase({
      findById: jest.fn().mockImplementation(() => {
        appels.push('findById');
        return Promise.resolve(makeActivite());
      }),
      deleteById: jest.fn().mockImplementation(() => {
        appels.push('deleteById');
        return Promise.resolve(undefined);
      }),
    });

    await useCase.execute('activite-1');

    expect(appels).toEqual(['findById', 'deleteById']);
  });
});
