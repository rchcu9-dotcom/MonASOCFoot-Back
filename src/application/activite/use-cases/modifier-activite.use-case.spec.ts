import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ModifierActiviteUseCase } from './modifier-activite.use-case';
import type { Activite } from '../../../domain/activite/entities/activite.entity';
import type { ActiviteRepository } from '../../../domain/activite/repositories/activite.repository.interface';
import type { ModifierActiviteDto } from '../dto/modifier-activite.dto';

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
    save: jest.fn((activite: Activite) => Promise.resolve(activite)),
    findUpcoming: jest.fn().mockResolvedValue([]),
    deleteById: jest.fn(),
    ...overrides,
  } as unknown as ActiviteRepository;

  return { useCase: new ModifierActiviteUseCase(activiteRepository), activiteRepository };
}

describe('ModifierActiviteUseCase', () => {
  it("lève NotFoundException quand l'activité n'existe pas, sans appeler save", async () => {
    const { useCase, activiteRepository } = makeUseCase({ findById: jest.fn().mockResolvedValue(null) });

    await expect(useCase.execute('inconnue', { label: 'Nouveau label' })).rejects.toThrow(
      NotFoundException,
    );
    expect(activiteRepository.save).not.toHaveBeenCalled();
  });

  it("lève BadRequestException quand aucun champ n'est fourni", async () => {
    const { useCase, activiteRepository } = makeUseCase();

    await expect(useCase.execute('activite-1', {} as ModifierActiviteDto)).rejects.toThrow(
      BadRequestException,
    );
    expect(activiteRepository.save).not.toHaveBeenCalled();
  });

  it('fusionne uniquement les champs fournis avec l\'existant', async () => {
    const existante = makeActivite({ label: 'Ancien label', commentaire: 'Ancien commentaire' });
    const { useCase, activiteRepository } = makeUseCase({
      findById: jest.fn().mockResolvedValue(existante),
    });

    const result = await useCase.execute('activite-1', { label: 'Nouveau label' });

    expect(result).toEqual({ ...existante, label: 'Nouveau label' });
    expect(activiteRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Nouveau label', commentaire: 'Ancien commentaire' }),
    );
  });

  it('modifie uniquement la date quand seul ce champ est fourni', async () => {
    const existante = makeActivite({ date: '2026-07-01' });
    const { useCase } = makeUseCase({ findById: jest.fn().mockResolvedValue(existante) });

    const result = await useCase.execute('activite-1', { date: '2026-08-15' });

    expect(result.date).toBe('2026-08-15');
    expect(result.label).toBe(existante.label);
  });

  it('modifie uniquement le type quand seul ce champ est fourni', async () => {
    const existante = makeActivite({ type: 'match' });
    const { useCase } = makeUseCase({ findById: jest.fn().mockResolvedValue(existante) });

    const result = await useCase.execute('activite-1', { type: 'autre' });

    expect(result.type).toBe('autre');
  });

  it('permet de vider le commentaire en transmettant une chaîne vide (différent de undefined)', async () => {
    const existante = makeActivite({ commentaire: 'Présent' });
    const { useCase } = makeUseCase({ findById: jest.fn().mockResolvedValue(existante) });

    const result = await useCase.execute('activite-1', { commentaire: '' });

    expect(result.commentaire).toBe('');
  });

  it('revalide heureDebut >= heureConvocation sur le résultat fusionné (heureConvocation modifiée seule)', async () => {
    const existante = makeActivite({ heureConvocation: '10:00', heureDebut: '11:00' });
    const { useCase, activiteRepository } = makeUseCase({
      findById: jest.fn().mockResolvedValue(existante),
    });

    await expect(useCase.execute('activite-1', { heureConvocation: '12:00' })).rejects.toThrow(
      BadRequestException,
    );
    expect(activiteRepository.save).not.toHaveBeenCalled();
  });

  it('accepte une modification valide où heureDebut et heureConvocation changent ensemble', async () => {
    const existante = makeActivite({ heureConvocation: '10:00', heureDebut: '11:00' });
    const { useCase } = makeUseCase({ findById: jest.fn().mockResolvedValue(existante) });

    const result = await useCase.execute('activite-1', {
      heureConvocation: '12:00',
      heureDebut: '12:30',
    });

    expect(result.heureConvocation).toBe('12:00');
    expect(result.heureDebut).toBe('12:30');
  });

  it("ne permet pas de modifier 'source' via le DTO (champ absent du type ModifierActiviteDto)", async () => {
    const existante = makeActivite({ source: 'manuel' });
    const { useCase } = makeUseCase({ findById: jest.fn().mockResolvedValue(existante) });

    const result = await useCase.execute('activite-1', { label: 'Nouveau label' });

    expect(result.source).toBe('manuel');
  });

  it('renvoie l\'activité persistée par le repository', async () => {
    const existante = makeActivite();
    const activitePersistee = makeActivite({ label: 'Sauvegardée' });
    const { useCase } = makeUseCase({
      findById: jest.fn().mockResolvedValue(existante),
      save: jest.fn().mockResolvedValue(activitePersistee),
    });

    const result = await useCase.execute('activite-1', { label: 'Nouveau label' });

    expect(result).toBe(activitePersistee);
  });
});
