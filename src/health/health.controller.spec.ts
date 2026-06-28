import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import type { HealthPayload } from './health.service';

describe('HealthController', () => {
  it('délègue à HealthService.check() et retourne exactement sa valeur', async () => {
    const payload: HealthPayload = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: 1,
      version: '0.1.0',
      environment: 'test',
    };
    const healthService = { check: jest.fn().mockReturnValue(payload) };

    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: healthService }],
    }).compile();

    const controller = moduleRef.get(HealthController);
    expect(controller.check()).toBe(payload);
    expect(healthService.check).toHaveBeenCalled();
  });
});
