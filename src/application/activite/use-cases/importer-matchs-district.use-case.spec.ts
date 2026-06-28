import { ImporterMatchsDistrictUseCase } from './importer-matchs-district.use-case';
import type { Activite } from '../../../domain/activite/entities/activite.entity';
import type { MatchDistrictBrut, SourceMatchsDistrictPort } from '../../../domain/activite/ports/source-matchs-district.port';
import type { ActiviteRepository } from '../../../domain/activite/repositories/activite.repository.interface';

function makeMatch(overrides: Partial<MatchDistrictBrut> = {}): MatchDistrictBrut {
  return {
    idExterne: 'district-1',
    date: '2026-07-01',
    heureDebut: '15:00',
    label: 'AS Orange Cesson Football vs Adversaire',
    ...overrides,
  };
}

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

function makeUseCase(options: {
  matchs?: MatchDistrictBrut[];
  source?: Partial<SourceMatchsDistrictPort>;
  repository?: Partial<ActiviteRepository>;
} = {}) {
  const source = {
    recupererMatchsAVenir: jest.fn().mockResolvedValue(options.matchs ?? []),
    ...options.source,
  } as unknown as SourceMatchsDistrictPort;

  const activiteRepository = {
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    save: jest.fn((entity: Activite) => Promise.resolve(entity)),
    findUpcoming: jest.fn().mockResolvedValue([]),
    deleteById: jest.fn(),
    findByIdExterne: jest.fn().mockResolvedValue(null),
    ...options.repository,
  } as unknown as ActiviteRepository;

  return {
    useCase: new ImporterMatchsDistrictUseCase(source, activiteRepository),
    source,
    activiteRepository,
  };
}

describe('ImporterMatchsDistrictUseCase', () => {
  it('renvoie un résultat vide quand la source ne retourne aucun match', async () => {
    const { useCase, activiteRepository } = makeUseCase({ matchs: [] });

    const resultat = await useCase.execute();

    expect(resultat).toEqual({ matchsRecuperes: 0, crees: 0, misAJour: 0, ignores: 0, erreurs: [] });
    expect(activiteRepository.save).not.toHaveBeenCalled();
  });

  it("propage l'erreur levée par le port sans effectuer d'écriture (ex. source non configurée)", async () => {
    const erreur = new Error('DISTRICT_SOURCE_URL non configurée');
    const { useCase, activiteRepository } = makeUseCase({
      source: { recupererMatchsAVenir: jest.fn().mockRejectedValue(erreur) },
    });

    await expect(useCase.execute()).rejects.toThrow(erreur);
    expect(activiteRepository.save).not.toHaveBeenCalled();
  });

  describe('branche 1 — match déjà importé (idExterne connu)', () => {
    it('met à jour les champs date/heures/label/commentaire et incrémente "misAJour"', async () => {
      const dejaImporte = makeActivite({
        id: 'deja-importe',
        idExterne: 'district-1',
        date: '2026-06-01',
        heureDebut: '10:00',
        heureConvocation: '09:00',
        label: 'Ancien label',
        commentaire: 'Ancien commentaire',
        source: 'import',
      });
      const match = makeMatch({
        idExterne: 'district-1',
        date: '2026-07-01',
        heureDebut: '15:00',
        heureConvocation: '14:00',
        label: 'Nouveau label',
        complement: 'Nouveau commentaire',
      });
      const { useCase, activiteRepository } = makeUseCase({
        matchs: [match],
        repository: { findByIdExterne: jest.fn().mockResolvedValue(dejaImporte) },
      });

      const resultat = await useCase.execute();

      expect(resultat).toEqual({ matchsRecuperes: 1, crees: 0, misAJour: 1, ignores: 0, erreurs: [] });
      expect(activiteRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'deja-importe',
          date: '2026-07-01',
          heureDebut: '15:00',
          heureConvocation: '14:00',
          label: 'Nouveau label',
          commentaire: 'Nouveau commentaire',
        }),
      );
    });

    it("conserve l'heureConvocation et le commentaire existants quand le match ré-importé ne les fournit pas", async () => {
      const dejaImporte = makeActivite({
        id: 'deja-importe',
        idExterne: 'district-1',
        heureConvocation: '13:30',
        commentaire: 'Convocation ajoutée manuellement',
        source: 'import',
      });
      const match = makeMatch({ idExterne: 'district-1', heureConvocation: undefined, complement: undefined });
      const { useCase, activiteRepository } = makeUseCase({
        matchs: [match],
        repository: { findByIdExterne: jest.fn().mockResolvedValue(dejaImporte) },
      });

      await useCase.execute();

      expect(activiteRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          heureConvocation: '13:30',
          commentaire: 'Convocation ajoutée manuellement',
        }),
      );
    });
  });

  describe('branche 2 — réclamation heuristique d\'une activité manuelle existante', () => {
    it('attribue idExterne à une activité manuelle de même date sans modifier ses autres champs, et incrémente "ignores"', async () => {
      const manuelle = makeActivite({
        id: 'manuelle-1',
        date: '2026-07-01',
        heureDebut: '16:00',
        label: 'Label saisi par l\'admin',
        source: 'manuel',
        type: 'match',
      });
      const match = makeMatch({ idExterne: 'district-1', date: '2026-07-01', label: 'Label du district' });
      const { useCase, activiteRepository } = makeUseCase({
        matchs: [match],
        repository: {
          findByIdExterne: jest.fn().mockResolvedValue(null),
          findAll: jest.fn().mockResolvedValue([manuelle]),
        },
      });

      const resultat = await useCase.execute();

      expect(resultat).toEqual({ matchsRecuperes: 1, crees: 0, misAJour: 0, ignores: 1, erreurs: [] });
      expect(activiteRepository.save).toHaveBeenCalledWith({ ...manuelle, idExterne: 'district-1' });
    });

    it('ignore les activités manuelles qui ne sont pas de type "match"', async () => {
      const manuelleAutre = makeActivite({ id: 'manuelle-autre', date: '2026-07-01', type: 'autre', source: 'manuel' });
      const match = makeMatch({ idExterne: 'district-1', date: '2026-07-01' });
      const { useCase, activiteRepository } = makeUseCase({
        matchs: [match],
        repository: {
          findByIdExterne: jest.fn().mockResolvedValue(null),
          findAll: jest.fn().mockResolvedValue([manuelleAutre]),
        },
      });

      const resultat = await useCase.execute();

      expect(resultat.crees).toBe(1);
      expect(resultat.ignores).toBe(0);
    });

    it('ignore les activités manuelles qui ont déjà un idExterne (déjà réclamées)', async () => {
      const dejaReclamee = makeActivite({
        id: 'deja-reclamee',
        date: '2026-07-01',
        type: 'match',
        source: 'manuel',
        idExterne: 'autre-match',
      });
      const match = makeMatch({ idExterne: 'district-1', date: '2026-07-01' });
      const { useCase, activiteRepository } = makeUseCase({
        matchs: [match],
        repository: {
          findByIdExterne: jest.fn().mockResolvedValue(null),
          findAll: jest.fn().mockResolvedValue([dejaReclamee]),
        },
      });

      const resultat = await useCase.execute();

      expect(resultat.crees).toBe(1);
      expect(resultat.ignores).toBe(0);
    });

    it('ignore les activités de source "import" lors de la recherche heuristique (seules les "manuel" sont éligibles)', async () => {
      const autreImport = makeActivite({ id: 'autre-import', date: '2026-07-01', type: 'match', source: 'import' });
      const match = makeMatch({ idExterne: 'district-1', date: '2026-07-01' });
      const { useCase, activiteRepository } = makeUseCase({
        matchs: [match],
        repository: {
          findByIdExterne: jest.fn().mockResolvedValue(null),
          findAll: jest.fn().mockResolvedValue([autreImport]),
        },
      });

      const resultat = await useCase.execute();

      expect(resultat.crees).toBe(1);
      expect(resultat.ignores).toBe(0);
    });
  });

  describe('branche 3 — aucune correspondance, création', () => {
    it('crée une nouvelle activité avec source "import" et type "match", et incrémente "crees"', async () => {
      const match = makeMatch({
        idExterne: 'district-1',
        date: '2026-07-01',
        heureDebut: '15:00',
        heureConvocation: '14:00',
        label: 'AS Orange Cesson Football vs Adversaire',
        complement: 'Coupe départementale',
      });
      const { useCase, activiteRepository } = makeUseCase({ matchs: [match] });

      const resultat = await useCase.execute();

      expect(resultat).toEqual({ matchsRecuperes: 1, crees: 1, misAJour: 0, ignores: 0, erreurs: [] });
      expect(activiteRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          date: '2026-07-01',
          heureDebut: '15:00',
          heureConvocation: '14:00',
          label: 'AS Orange Cesson Football vs Adversaire',
          commentaire: 'Coupe départementale',
          type: 'match',
          source: 'import',
          idExterne: 'district-1',
        }),
      );
    });

    it("retombe sur heureDebut quand heureConvocation n'est pas fournie par la source", async () => {
      const match = makeMatch({ heureDebut: '15:00', heureConvocation: undefined });
      const { useCase, activiteRepository } = makeUseCase({ matchs: [match] });

      await useCase.execute();

      expect(activiteRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ heureConvocation: '15:00' }),
      );
    });

    it('génère un id différent pour chaque activité créée', async () => {
      const matchs = [makeMatch({ idExterne: 'd1' }), makeMatch({ idExterne: 'd2' })];
      const { useCase, activiteRepository } = makeUseCase({ matchs });

      await useCase.execute();

      const idsCrees = (activiteRepository.save as jest.Mock).mock.calls.map((call) => call[0].id);
      expect(new Set(idsCrees).size).toBe(2);
    });
  });

  describe('traitement du lot — isolation des erreurs', () => {
    it("ajoute un message d'erreur par match en échec sans interrompre le traitement des suivants", async () => {
      const matchEnEchec = makeMatch({ idExterne: 'echec-1' });
      const matchOk = makeMatch({ idExterne: 'ok-1' });
      const { useCase, activiteRepository } = makeUseCase({
        matchs: [matchEnEchec, matchOk],
        repository: {
          findByIdExterne: jest.fn().mockImplementation((idExterne: string) => {
            if (idExterne === 'echec-1') {
              return Promise.reject(new Error('Erreur base de données'));
            }
            return Promise.resolve(null);
          }),
        },
      });

      const resultat = await useCase.execute();

      expect(resultat.erreurs).toEqual(['Match echec-1: Erreur base de données']);
      expect(resultat.crees).toBe(1);
      expect(activiteRepository.save).toHaveBeenCalledTimes(1);
    });

    it('convertit une exception non-Error en message string dans erreurs[]', async () => {
      const match = makeMatch({ idExterne: 'echec-string' });
      const { useCase } = makeUseCase({
        matchs: [match],
        repository: { findByIdExterne: jest.fn().mockRejectedValue('panne réseau') },
      });

      const resultat = await useCase.execute();

      expect(resultat.erreurs).toEqual(['Match echec-string: panne réseau']);
    });
  });

  it('comptabilise matchsRecuperes indépendamment du nombre de créations/mises à jour/erreurs', async () => {
    const matchs = [makeMatch({ idExterne: 'a' }), makeMatch({ idExterne: 'b' }), makeMatch({ idExterne: 'c' })];
    const { useCase } = makeUseCase({
      matchs,
      repository: {
        findByIdExterne: jest.fn().mockImplementation((idExterne: string) =>
          idExterne === 'a' ? Promise.reject(new Error('boom')) : Promise.resolve(null),
        ),
      },
    });

    const resultat = await useCase.execute();

    expect(resultat.matchsRecuperes).toBe(3);
    expect(resultat.crees + resultat.misAJour + resultat.ignores).toBe(2);
    expect(resultat.erreurs).toHaveLength(1);
  });
});
