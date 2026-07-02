import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const backRoot = join(__dirname, '../..');
const projectRoot = join(backRoot, '..');

/**
 * Garde-fous pour `organisation-git-deploiement-monasocfoot`. Lionel a explicitement validé
 * le passage à l'étape suivante (push + CI/CD + premier déploiement staging, 2026-07-01) :
 * remote GitHub et workflows CI/CD sont désormais attendus. Seule l'absence de secrets commités
 * reste une limite absolue.
 *
 * Suite entière sautée en CI : elle inspecte l'état du dépôt Git local (branches, remote, arbre
 * de travail), sans objet dans un runner dont le checkout est superficiel et limité à la branche
 * déclenchante (`main` n'y est ni fetché ni résolvable).
 */
function git(args: string[]): string {
  return execFileSync('git', args, { cwd: backRoot, encoding: 'utf-8' }).trim();
}

(process.env.CI ? describe.skip : describe)('back/ — organisation Git locale', () => {
  it('est un dépôt Git valide', () => {
    expect(git(['rev-parse', '--is-inside-work-tree'])).toBe('true');
  });

  it('a au moins un commit sur la branche main', () => {
    expect(git(['rev-parse', '--verify', 'main'])).toMatch(/^[0-9a-f]{40}$/);
  });

  it('a une branche staging locale', () => {
    const branches = git(['branch', '--list']);
    expect(branches).toMatch(/\bmain\b/);
    expect(branches).toMatch(/\bstaging\b/);
  });

  it("a un remote origin configuré vers le dépôt GitHub MonASOCFoot-Back", () => {
    expect(git(['remote'])).toContain('origin');
    expect(git(['remote', 'get-url', 'origin'])).toContain('MonASOCFoot-Back');
  });

  it('a un répertoire .github/workflows (CI/CD staging)', () => {
    expect(existsSync(join(backRoot, '.github', 'workflows'))).toBe(true);
  });

  it("n'a aucun fichier .env réel (uniquement le gabarit .env.example) ni clé/secret suivi par Git", () => {
    const trackedFiles = git(['ls-files']).split('\n');
    const fichiersSensibles = trackedFiles.filter((f) => {
      if (f === '.env.example') return false; // gabarit sans valeur réelle, volontairement committé
      return /(^|\/)\.env(\..*)?$|service-account|-key\.json$/i.test(f);
    });
    expect(fichiersSensibles).toEqual([]);
  });

  it('ignore node_modules, dist, .env, .env.local et coverage', () => {
    const gitignore = readFileSync(join(backRoot, '.gitignore'), 'utf-8');
    for (const entry of ['/node_modules', '/dist', '.env', '.env.local', '/coverage']) {
      expect(gitignore).toContain(entry);
    }
  });

  it("n'est pas imbriqué dans un dépôt Git à la racine du projet (deux dépôts séparés, pas de monorepo)", () => {
    expect(existsSync(join(projectRoot, '.git'))).toBe(false);
  });
});
