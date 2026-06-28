import { DisponibilitesController } from './disponibilites.controller';
import type { ConsulterDisponibilitesEffectifUseCase } from '../../../application/disponibilite/use-cases/consulter-disponibilites-effectif.use-case';
import type { DisponibilitesEffectifResponseDto } from '../../../application/disponibilite/dto/disponibilite-effectif.dto';

function makeController(execute: jest.Mock) {
  const useCase = { execute } as unknown as ConsulterDisponibilitesEffectifUseCase;
  return new DisponibilitesController(useCase);
}

const reponseVide: DisponibilitesEffectifResponseDto = { activites: [], joueurs: [] };

describe('DisponibilitesController', () => {
  it('délègue au use case sans aucun paramètre quand ni date ni activiteId ne sont fournis', async () => {
    const execute = jest.fn().mockResolvedValue(reponseVide);
    const controller = makeController(execute);

    const result = await controller.getEffectif();

    expect(execute).toHaveBeenCalledWith({ date: undefined, activiteId: undefined });
    expect(result).toBe(reponseVide);
  });

  it('mappe le query param "date" vers le DTO transmis au use case', async () => {
    const execute = jest.fn().mockResolvedValue(reponseVide);
    const controller = makeController(execute);

    await controller.getEffectif('2026-07-01');

    expect(execute).toHaveBeenCalledWith({ date: '2026-07-01', activiteId: undefined });
  });

  it('mappe le query param "activiteId" vers le DTO transmis au use case', async () => {
    const execute = jest.fn().mockResolvedValue(reponseVide);
    const controller = makeController(execute);

    await controller.getEffectif(undefined, 'activite-42');

    expect(execute).toHaveBeenCalledWith({ date: undefined, activiteId: 'activite-42' });
  });

  it('mappe à la fois "date" et "activiteId" quand les deux sont fournis (résolution de priorité déléguée au use case)', async () => {
    const execute = jest.fn().mockResolvedValue(reponseVide);
    const controller = makeController(execute);

    await controller.getEffectif('2026-07-01', 'activite-42');

    expect(execute).toHaveBeenCalledWith({ date: '2026-07-01', activiteId: 'activite-42' });
  });

  it('renvoie directement la réponse du use case', async () => {
    const reponse: DisponibilitesEffectifResponseDto = {
      activites: [
        {
          id: 'a1',
          date: '2026-07-01',
          heureConvocation: '14:00',
          heureDebut: '15:00',
          label: 'Match',
          type: 'match',
        },
      ],
      joueurs: [],
    };
    const execute = jest.fn().mockResolvedValue(reponse);
    const controller = makeController(execute);

    const result = await controller.getEffectif();

    expect(result).toBe(reponse);
  });
});
