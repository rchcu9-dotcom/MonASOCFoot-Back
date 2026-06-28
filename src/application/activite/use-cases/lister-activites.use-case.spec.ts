import { ListerActivitesUseCase } from './lister-activites.use-case';
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
    findById: jest.fn().mockResolvedValue(null),
    save: jest.fn(),
    findUpcoming: jest.fn().mockResolvedValue([]),
    deleteById: jest.fn(),
    ...overrides,
  } as unknown as ActiviteRepository;

  return { useCase: new ListerActivitesUseCase(activiteRepository), activiteRepository };
}

describe('ListerActivitesUseCase', () => {
  it('délègue à findAll() — pas à findUpcoming() — pour inclure les activités passées', async () => {
    const { useCase, activiteRepository } = makeUseCase();

    await useCase.execute();

    expect(activiteRepository.findAll).toHaveBeenCalledTimes(1);
    expect(activiteRepository.findUpcoming).not.toHaveBeenCalled();
  });

  it('renvoie la liste telle que retournée par le repository, y compris des activités passées', async () => {
    const activitePassee = makeActivite({ id: 'a1', date: '2020-01-01' });
    const activiteFuture = makeActivite({ id: 'a2', date: '2030-01-01' });
    const { useCase } = makeUseCase({
      findAll: jest.fn().mockResolvedValue([activitePassee, activiteFuture]),
    });

    const result = await useCase.execute();

    expect(result).toEqual([activitePassee, activiteFuture]);
  });

  it('renvoie une liste vide quand le repository ne contient aucune activité', async () => {
    const { useCase } = makeUseCase();

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });
});
