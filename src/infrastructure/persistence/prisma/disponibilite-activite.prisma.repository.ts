import { Injectable, NotFoundException } from '@nestjs/common';
import type { DisponibiliteActivite as DisponibiliteActiviteRow } from '@prisma/client';
import { DisponibiliteActivite } from '../../../domain/disponibilite/entities/disponibilite-activite.entity';
import { StatutDisponibilite } from '../../../domain/disponibilite/entities/statut-disponibilite.enum';
import { DisponibiliteActiviteRepository } from '../../../domain/disponibilite/repositories/disponibilite-activite.repository.interface';
import { PrismaService } from './prisma.service';

@Injectable()
export class DisponibiliteActivitePrismaRepository
  implements DisponibiliteActiviteRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<DisponibiliteActivite[]> {
    const rows = await this.prisma.disponibiliteActivite.findMany();
    return rows.map(toDomain);
  }

  async findById(id: string): Promise<DisponibiliteActivite | null> {
    const row = await this.prisma.disponibiliteActivite.findUnique({
      where: { id },
    });
    return row ? toDomain(row) : null;
  }

  async save(entity: DisponibiliteActivite): Promise<DisponibiliteActivite> {
    const data = toPersistence(entity);
    const saved = await this.prisma.disponibiliteActivite.upsert({
      where: { id: entity.id },
      create: data,
      update: data,
    });
    return toDomain(saved);
  }

  async findByActiviteIds(
    activiteIds: string[],
  ): Promise<DisponibiliteActivite[]> {
    if (activiteIds.length === 0) return [];
    const rows = await this.prisma.disponibiliteActivite.findMany({
      where: { activiteId: { in: activiteIds } },
    });
    return rows.map(toDomain);
  }

  async findByUtilisateurEtActivite(
    utilisateurId: string,
    activiteId: string,
  ): Promise<DisponibiliteActivite | null> {
    const row = await this.prisma.disponibiliteActivite.findUnique({
      where: { utilisateurId_activiteId: { utilisateurId, activiteId } },
    });
    return row ? toDomain(row) : null;
  }

  async deleteById(id: string): Promise<void> {
    try {
      await this.prisma.disponibiliteActivite.delete({ where: { id } });
    } catch {
      throw new NotFoundException(`Disponibilité d'activité ${id} introuvable`);
    }
  }
}

function toDomain(row: DisponibiliteActiviteRow): DisponibiliteActivite {
  return {
    id: row.id,
    utilisateurId: row.utilisateurId,
    activiteId: row.activiteId,
    statut: row.statut as StatutDisponibilite,
    commentaire: row.commentaire ?? undefined,
  };
}

function toPersistence(entity: DisponibiliteActivite): {
  id: string;
  utilisateurId: string;
  activiteId: string;
  statut: StatutDisponibilite;
  commentaire: string | null;
} {
  return {
    id: entity.id,
    utilisateurId: entity.utilisateurId,
    activiteId: entity.activiteId,
    statut: entity.statut,
    commentaire: entity.commentaire ?? null,
  };
}
