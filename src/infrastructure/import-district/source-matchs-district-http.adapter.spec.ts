import { ServiceUnavailableException } from '@nestjs/common';
import { SourceMatchsDistrictHttpAdapter } from './source-matchs-district-http.adapter';

describe('SourceMatchsDistrictHttpAdapter', () => {
  const ENV_ORIGINAL = process.env.DISTRICT_SOURCE_URL;

  afterEach(() => {
    if (ENV_ORIGINAL === undefined) {
      delete process.env.DISTRICT_SOURCE_URL;
    } else {
      process.env.DISTRICT_SOURCE_URL = ENV_ORIGINAL;
    }
  });

  it('lève ServiceUnavailableException quand DISTRICT_SOURCE_URL est absente', async () => {
    delete process.env.DISTRICT_SOURCE_URL;
    const adapter = new SourceMatchsDistrictHttpAdapter();

    await expect(adapter.recupererMatchsAVenir()).rejects.toThrow(ServiceUnavailableException);
    await expect(adapter.recupererMatchsAVenir()).rejects.toThrow(/DISTRICT_SOURCE_URL/);
  });

  it('lève ServiceUnavailableException quand DISTRICT_SOURCE_URL est vide (chaîne vide traitée comme absente)', async () => {
    process.env.DISTRICT_SOURCE_URL = '';
    const adapter = new SourceMatchsDistrictHttpAdapter();

    await expect(adapter.recupererMatchsAVenir()).rejects.toThrow(ServiceUnavailableException);
  });

  it("lève quand même ServiceUnavailableException quand DISTRICT_SOURCE_URL est configurée (stub volontaire, parsing non implémenté)", async () => {
    process.env.DISTRICT_SOURCE_URL = 'https://district.example.org/matchs';
    const adapter = new SourceMatchsDistrictHttpAdapter();

    await expect(adapter.recupererMatchsAVenir()).rejects.toThrow(ServiceUnavailableException);
    await expect(adapter.recupererMatchsAVenir()).rejects.toThrow(/reste à implémenter/);
  });
});
