import { HealthService } from './health.service';

describe('HealthService', () => {
  it('retourne un statut ok avec un timestamp ISO valide et un uptime numérique', () => {
    const service = new HealthService();
    const result = service.check();

    expect(result.status).toBe('ok');
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    expect(typeof result.uptime).toBe('number');
    expect(result.uptime).toBeGreaterThanOrEqual(0);
    expect(typeof result.version).toBe('string');
    expect(typeof result.environment).toBe('string');
  });

  it("vaut 'development' par défaut quand NODE_ENV est absent", () => {
    const previous = process.env.NODE_ENV;
    delete process.env.NODE_ENV;

    const result = new HealthService().check();
    expect(result.environment).toBe('development');

    if (previous !== undefined) process.env.NODE_ENV = previous;
  });
});
