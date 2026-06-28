import { PrismaService } from './prisma.service';

/**
 * Le bug corrigé par `persistence-alwaysdata-monasocfoot` (cf. track.md) se manifestait au
 * boot — `PrismaClientInitializationError` avant même que le serveur n'écoute — précisément
 * parce que `onModuleInit` appelle `$connect()` de façon **eager** plutôt que de laisser Prisma
 * se connecter paresseusement à la première requête. Ces tests verrouillent ce comportement :
 * une régression vers une connexion paresseuse masquerait silencieusement les erreurs de
 * configuration `DATABASE_URL` derrière un endpoint qui répond 200 sans avoir vérifié la base.
 */
describe('PrismaService', () => {
  it('se connecte à la base au démarrage du module (onModuleInit appelle $connect)', async () => {
    const service = new PrismaService();
    const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(connectSpy).toHaveBeenCalledTimes(1);
  });

  it('se déconnecte proprement à la destruction du module (onModuleDestroy appelle $disconnect)', async () => {
    const service = new PrismaService();
    const disconnectSpy = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);

    await service.onModuleDestroy();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });

  it("propage l'erreur de connexion plutôt que de l'avaler (le boot doit échouer fort, pas silencieusement)", async () => {
    const service = new PrismaService();
    const erreur = new Error("Can't reach database server at 'localhost:3306'");
    jest.spyOn(service, '$connect').mockRejectedValue(erreur);

    await expect(service.onModuleInit()).rejects.toThrow(erreur);
  });
});
