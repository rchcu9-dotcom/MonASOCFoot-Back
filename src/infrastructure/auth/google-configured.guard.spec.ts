import { ServiceUnavailableException } from '@nestjs/common';
import { isGoogleOAuthConfigured } from '@rchcu9-dotcom/auth-passport-back';
import { GoogleConfiguredGuard } from './google-configured.guard';

jest.mock('@rchcu9-dotcom/auth-passport-back', () => ({
  isGoogleOAuthConfigured: jest.fn(),
}));

describe('GoogleConfiguredGuard', () => {
  beforeEach(() => {
    jest.mocked(isGoogleOAuthConfigured).mockReset();
  });

  it('retourne true quand isGoogleOAuthConfigured() renvoie true', () => {
    jest.mocked(isGoogleOAuthConfigured).mockReturnValue(true);
    const guard = new GoogleConfiguredGuard();

    expect(guard.canActivate()).toBe(true);
  });

  it('lève ServiceUnavailableException quand isGoogleOAuthConfigured() renvoie false', () => {
    jest.mocked(isGoogleOAuthConfigured).mockReturnValue(false);
    const guard = new GoogleConfiguredGuard();

    expect(() => guard.canActivate()).toThrow(ServiceUnavailableException);
  });
});
