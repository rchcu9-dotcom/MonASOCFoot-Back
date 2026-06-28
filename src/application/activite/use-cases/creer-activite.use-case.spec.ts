import { BadRequestException } from '@nestjs/common';
import { CreerActiviteUseCase } from './creer-activite.use-case';
import type { Activite } from '../../../domain/activite/entities/activite.entity';
import type { ActiviteRepository } from '../../../domain/activite/repositories/activite.repository.interface';
import type { CreerActiviteDto } from '../dto/creer-activite.dto';

function makeDto(overrides: Partial<CreerActiviteDto> = {}): CreerActiviteDto {
  return {
    date: '2026-07-01',
    heureConvocation: '14:00',
    heureDebut: '15:00',
    label: 'Match amical',
    type: 'match',
    ...overrides,
  };
}

function makeUseCase(overrides: Partial<ActiviteRepository> = {}) {
  const activiteRepository = {
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    save: jest.fn((activite: Activite) => Promise.resolve(activite)),
    findUpcoming: jest.fn().mockResolvedValue([]),
    deleteById: jest.fn(),
    ...overrides,
  } as unknown as ActiviteRepository;

  return { useCase: new CreerActiviteUseCase(activiteRepository), activiteRepository };
}

describe('CreerActiviteUseCase', () => {
  it('crée une activité avec un id généré et source forcée à "manuel"', async () => {
    const { useCase, activiteRepository } = makeUseCase();

    const result = await useCase.execute(makeDto());

    expect(result.id).toBeTruthy();
    expect(result.source).toBe('manuel');
    expect(activiteRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'manuel', label: 'Match amical' }),
    );
  });

  it('génère un id différent à chaque appel', async () => {
    const { useCase } = makeUseCase();

    const premiere = await useCase.execute(makeDto());
    const seconde = await useCase.execute(makeDto());

    expect(premiere.id).not.toBe(seconde.id);
  });

  it('transmet le commentaire optionnel quand il est fourni', async () => {
    const { useCase } = makeUseCase();

    const result = await useCase.execute(makeDto({ commentaire: 'RDV au stade' }));

    expect(result.commentaire).toBe('RDV au stade');
  });

  it("ignore toute valeur de 'source' transmise par le client (toujours forcée à 'manuel')", async () => {
    const { useCase } = makeUseCase();
    const dto = makeDto() as CreerActiviteDto & { source?: string };
    dto.source = 'import';

    const result = await useCase.execute(dto);

    expect(result.source).toBe('manuel');
  });

  it('accepte heureDebut strictement égale à heureConvocation', async () => {
    const { useCase } = makeUseCase();

    const result = await useCase.execute(makeDto({ heureConvocation: '14:00', heureDebut: '14:00' }));

    expect(result.heureDebut).toBe('14:00');
  });

  it("lève BadRequestException quand heureDebut est antérieure à heureConvocation, sans appeler save", async () => {
    const { useCase, activiteRepository } = makeUseCase();

    await expect(
      useCase.execute(makeDto({ heureConvocation: '15:00', heureDebut: '14:00' })),
    ).rejects.toThrow(BadRequestException);
    expect(activiteRepository.save).not.toHaveBeenCalled();
  });

  it('renvoie l\'activité persistée par le repository', async () => {
    const activitePersistee: Activite = {
      id: 'id-force-par-le-repo',
      date: '2026-07-01',
      heureConvocation: '14:00',
      heureDebut: '15:00',
      label: 'Match amical',
      type: 'match',
      source: 'manuel',
    };
    const { useCase } = makeUseCase({ save: jest.fn().mockResolvedValue(activitePersistee) });

    const result = await useCase.execute(makeDto());

    expect(result).toBe(activitePersistee);
  });
});
