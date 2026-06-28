import { Injectable } from '@nestjs/common';
import type { DisponibiliteJournee as DisponibiliteJourneeRow } from '@prisma/client';
import { DisponibiliteJournee } from '../../../domain/disponibilite/entities/disponibilite-journee.entity';
import { StatutDisponibilite } from '../../../domain/disponibilite/entities/statut-disponibilite.enum';
import { DisponibiliteJourneeRepository } from '../../../domain/disponibilite/repositories/disponibilite-journee.repository.interface';
import { PrismaService } from './prisma.service';

@Injectable()
export class DisponibiliteJourneePrismaRepository
  implements DisponibiliteJourneeRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<DisponibiliteJournee[]> {
    const rows = await this.prisma.disponibiliteJournee.findMany();
    return rows.map(toDomain);
  }

  async findById(id: string): Promise<DisponibiliteJournee | null> {
    const row = await this.prisma.disponibiliteJournee.findUnique({
      where: { id },
    });
    return row ? toDomain(row) : null;
  }

  async save(entity: DisponibiliteJournee): Promise<DisponibiliteJournee> {
    const data = toPersistence(entity);
    const saved = await this.prisma.disponibiliteJournee.upsert({
      where: { id: entity.id },
      create: data,
      update: data,
    });
    return toDomain(saved);
  }

  async findByDates(dates: string[]): Promise<DisponibiliteJournee[]> {
    if (dates.length === 0) return [];
    const rows = await this.prisma.disponibiliteJournee.findMany({
      where: { date: { in: dates } },
    });
    return rows.map(toDomain);
  }

  async findByUtilisateurEtDate(
    utilisateurId: string,
    date: string,
  ): Promise<DisponibiliteJournee | null> {
    const row = await this.prisma.disponibiliteJournee.findUnique({
      where: { utilisateurId_date: { utilisateurId, date } },
    });
    return row ? toDomain(row) : null;
  }

  async findByUtilisateurId(utilisateurId: string): Promise<DisponibiliteJournee[]> {
    const rows = await this.prisma.disponibiliteJournee.findMany({
      where: { utilisateurId },
    });
    return rows.map(toDomain);
  }
}

function toDomain(row: DisponibiliteJourneeRow): DisponibiliteJournee {
  return {
    id: row.id,
    utilisateurId: row.utilisateurId,
    date: row.date,
    statut: row.statut as StatutDisponibilite,
    commentaire: row.commentaire ?? undefined,
  };
}

function toPersistence(entity: DisponibiliteJournee): {
  id: string;
  utilisateurId: string;
  date: string;
  statut: StatutDisponibilite;
  commentaire: string | null;
} {
  return {
    id: entity.id,
    utilisateurId: entity.utilisateurId,
    date: entity.date,
    statut: entity.statut,
    commentaire: entity.commentaire ?? null,
  };
}
