import { fusionnerDisponibiliteEffective } from './fusionner-disponibilite-effective';
import type { DisponibiliteActivite } from '../../../domain/disponibilite/entities/disponibilite-activite.entity';
import type { DisponibiliteJournee } from '../../../domain/disponibilite/entities/disponibilite-journee.entity';

const surchargeActivite: DisponibiliteActivite = {
  id: 'da-1',
  utilisateurId: 'user-1',
  activiteId: 'activite-1',
  statut: 'present',
  commentaire: 'Je viendrai en retard',
};

const dispoJournee: DisponibiliteJournee = {
  id: 'dj-1',
  utilisateurId: 'user-1',
  date: '2026-07-01',
  statut: 'absent',
  commentaire: 'Empêché',
};

describe('fusionnerDisponibiliteEffective', () => {
  it("priorise la surcharge d'activité quand elle existe, même si une dispo de journée existe aussi", () => {
    const result = fusionnerDisponibiliteEffective(surchargeActivite, dispoJournee);

    expect(result).toEqual({
      statut: 'present',
      commentaire: 'Je viendrai en retard',
      source: 'activite',
    });
  });

  it("retombe sur la dispo de journée quand aucune surcharge d'activité n'existe", () => {
    const result = fusionnerDisponibiliteEffective(undefined, dispoJournee);

    expect(result).toEqual({
      statut: 'absent',
      commentaire: 'Empêché',
      source: 'journee',
    });
  });

  it('renvoie statut "autre" et source "aucune" quand ni surcharge ni dispo de journée n\'existent', () => {
    const result = fusionnerDisponibiliteEffective(undefined, undefined);

    expect(result).toEqual({ statut: 'autre', source: 'aucune' });
  });

  it('transmet un commentaire undefined tel quel quand la source retenue ne porte pas de commentaire', () => {
    const surchargeSansCommentaire: DisponibiliteActivite = {
      id: 'da-2',
      utilisateurId: 'user-1',
      activiteId: 'activite-1',
      statut: 'disponible',
    };

    const result = fusionnerDisponibiliteEffective(surchargeSansCommentaire, dispoJournee);

    expect(result).toEqual({ statut: 'disponible', commentaire: undefined, source: 'activite' });
  });
});
