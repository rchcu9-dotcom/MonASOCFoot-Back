import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const backRoot = join(__dirname, '../..');
const projectRoot = join(backRoot, '..');

/**
 * Garde-fous pour `organisation-git-deploiement-monasocfoot` : tant que la spec reste bloquée
 * (cf. docs/specs/organisation-git-deploiement-monasocfoot.track.md), seule l'initialisation
 * d'un dépôt Git **local** est autorisée — aucun remote, aucun dépôt GitHub, aucune CI/CD,
 * aucun secret commité. Ces tests échouent volontairement si l'une de ces limites est franchie
 * sans qu'une mise à jour explicite (et donc consciente) de ce fichier ne l'accompagne.
 */
function git(args: string[]): string {
  return execFileSync('git', args, { cwd: backRoot, encoding: 'utf-8' }).trim();
}

describe('back/ — organisation Git locale', () => {
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

  it("n'a aucun remote configuré (aucune création de dépôt distant tant que Lionel n'a pas validé)", () => {
    expect(git(['remote'])).toBe('');
  });

  it("n'a pas de répertoire .github/workflows (aucune CI/CD avant la création des dépôts distants)", () => {
    expect(existsSync(join(backRoot, '.github', 'workflows'))).toBe(false);
  });

  it('a un arbre de travail propre (rien en attente après le commit initial)', () => {
    expect(git(['status', '--porcelain'])).toBe('');
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
