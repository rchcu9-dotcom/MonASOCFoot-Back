import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = join(__dirname, '../../..');
const specsDir = join(projectRoot, 'docs', 'specs');

/**
 * Garde-fou pour `persistence-alwaysdata-monasocfoot` : la bascule a été documentée dans
 * docs/specs/persistence-alwaysdata-monasocfoot.{md,track.md} en copiant initialement la
 * vraie chaîne `DATABASE_URL` (host + mot de passe AlwaysData réels) depuis `back/.env.local`
 * dans ces documents — repéré et corrigé en QA. `back/.env.local` est gitignoré et fait pour
 * contenir ce secret ; un fichier de doc ne l'est pas et ne doit jamais le reproduire, même si
 * la racine du projet n'est pas encore versionnée (cf. organisation-git-deploiement-monasocfoot).
 *
 * Sauté en CI : `docs/` vit à la racine du monorepo local, hors du repo GitHub isolé
 * `MonASOCFoot-Back` (qui ne contient que le contenu de `back/`) — le fichier n'y existe pas.
 */
(process.env.CI ? describe.skip : describe)('docs/specs/persistence-alwaysdata-monasocfoot — pas de secret réel dans la documentation', () => {
  const fichiers = ['persistence-alwaysdata-monasocfoot.md', 'persistence-alwaysdata-monasocfoot.track.md'];

  it.each(fichiers)("%s ne contient pas d'identifiants de connexion mysql:// en clair", (nomFichier) => {
    const contenu = readFileSync(join(specsDir, nomFichier), 'utf-8');

    // Une URL mysql:// avec un mot de passe non-placeholder ressemble à mysql://user:VraiMotDePasse@host:port/db.
    // Les gabarits documentés utilisent toujours un nom entre chevrons (ex. <mot-de-passe>) ou des
    // valeurs manifestement factices (root/password/localhost) — jamais une chaîne alphanumérique opaque.
    const motsDePasseEnClair = [...contenu.matchAll(/mysql:\/\/[^:]+:([^@]+)@/g)]
      .map((match) => match[1])
      .filter((motDePasse) => !/^(<.*>|password)$/.test(motDePasse));

    expect(motsDePasseEnClair).toEqual([]);
  });

  it.each(fichiers)('%s ne contient pas le mot de passe AlwaysData réel connu', (nomFichier) => {
    const contenu = readFileSync(join(specsDir, nomFichier), 'utf-8');

    expect(contenu).not.toMatch(/KHHqFk4g29UY_De/);
  });
});
