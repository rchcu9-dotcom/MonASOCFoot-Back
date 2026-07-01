import { ConsulterPlanificationActivitesUseCase } from './consulter-planification-activites.use-case';
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
    findSansDate: jest.fn().mockResolvedValue([]),
    deleteById: jest.fn(),
    findByIdExterne: jest.fn().mockResolvedValue(null),
    ...overrides,
  } as unknown as ActiviteRepository;

  return {
    useCase: new ConsulterPlanificationActivitesUseCase(activiteRepository),
    activiteRepository,
  };
}

describe('ConsulterPlanificationActivitesUseCase', () => {
  it('délègue à findSansDate() pour la colonne "sansDate" et la renvoie telle quelle', async () => {
    const sansDate1 = makeActivite({ id: 'sd1', date: undefined });
    const sansDate2 = makeActivite({ id: 'sd2', date: undefined });
    const { useCase, activiteRepository } = makeUseCase({
      findSansDate: jest.fn().mockResolvedValue([sansDate1, sansDate2]),
    });

    const result = await useCase.execute();

    expect(activiteRepository.findSansDate).toHaveBeenCalledTimes(1);
    expect(result.sansDate).toEqual([sansDate1, sansDate2]);
  });

  it("appelle findUpcoming avec la date du jour (ISO yyyy-mm-dd) pour la colonne calendrier", async () => {
    const { useCase, activiteRepository } = makeUseCase();

    await useCase.execute();

    const aujourdHui = new Date().toISOString().slice(0, 10);
    expect(activiteRepository.findUpcoming).toHaveBeenCalledWith(aujourdHui);
  });

  it('utilise 8 semaines par défaut comme fenêtre temporelle quand "semaines" n\'est pas fourni', async () => {
    const aujourdHui = new Date().toISOString().slice(0, 10);
    const dansHuitSemaines = ajouterJoursTest(aujourdHui, 8 * 7);
    const dansNeufSemaines = ajouterJoursTest(aujourdHui, 9 * 7);
    const activiteDansLaFenetre = makeActivite({ id: 'dans-fenetre', date: dansHuitSemaines });
    const activiteHorsFenetre = makeActivite({ id: 'hors-fenetre', date: dansNeufSemaines });

    const { useCase } = makeUseCase({
      findUpcoming: jest.fn().mockResolvedValue([activiteDansLaFenetre, activiteHorsFenetre]),
    });

    const result = await useCase.execute();

    expect(result.calendrier.map((a) => a.id)).toEqual(['dans-fenetre']);
  });

  it('borne la fenêtre temporelle selon la valeur "semaines" fournie explicitement', async () => {
    const aujourdHui = new Date().toISOString().slice(0, 10);
    const dansDeuxSemaines = ajouterJoursTest(aujourdHui, 2 * 7);
    const dansTroisSemaines = ajouterJoursTest(aujourdHui, 3 * 7);
    const activiteDansLaFenetre = makeActivite({ id: 'dans-fenetre', date: dansDeuxSemaines });
    const activiteHorsFenetre = makeActivite({ id: 'hors-fenetre', date: dansTroisSemaines });

    const { useCase } = makeUseCase({
      findUpcoming: jest.fn().mockResolvedValue([activiteDansLaFenetre, activiteHorsFenetre]),
    });

    const result = await useCase.execute(2);

    expect(result.calendrier.map((a) => a.id)).toEqual(['dans-fenetre']);
  });

  it('étend la fenêtre quand "semaines" est augmenté (mécanisme "Charger plus")', async () => {
    const aujourdHui = new Date().toISOString().slice(0, 10);
    const dansNeufSemaines = ajouterJoursTest(aujourdHui, 9 * 7);
    const activite = makeActivite({ id: 'a1', date: dansNeufSemaines });

    const { useCase } = makeUseCase({
      findUpcoming: jest.fn().mockResolvedValue([activite]),
    });

    const resultAvecHuitSemaines = await useCase.execute(8);
    const resultAvecDouzeSemaines = await useCase.execute(12);

    expect(resultAvecHuitSemaines.calendrier).toEqual([]);
    expect(resultAvecDouzeSemaines.calendrier.map((a) => a.id)).toEqual(['a1']);
  });

  it('renvoie sansDate et calendrier vides quand le repository ne contient aucune activité', async () => {
    const { useCase } = makeUseCase();

    const result = await useCase.execute();

    expect(result).toEqual({ sansDate: [], calendrier: [] });
  });

  it('exécute findSansDate et findUpcoming en parallèle (les deux sont appelés une seule fois)', async () => {
    const { useCase, activiteRepository } = makeUseCase();

    await useCase.execute();

    expect(activiteRepository.findSansDate).toHaveBeenCalledTimes(1);
    expect(activiteRepository.findUpcoming).toHaveBeenCalledTimes(1);
  });
});

function ajouterJoursTest(dateIso: string, jours: number): string {
  const date = new Date(`${dateIso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + jours);
  return date.toISOString().slice(0, 10);
}
