import { Injectable, NotFoundException } from '@nestjs/common';
import type { Activite as ActiviteRow } from '@prisma/client';
import {
  Activite,
  SourceActivite,
  TypeActivite,
} from '../../../domain/activite/entities/activite.entity';
import { ActiviteRepository } from '../../../domain/activite/repositories/activite.repository.interface';
import { PrismaService } from './prisma.service';

@Injectable()
export class ActivitePrismaRepository implements ActiviteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Activite[]> {
    const activites = await this.prisma.activite.findMany({
      orderBy: { date: 'asc' },
    });
    return activites.map(toDomain);
  }

  async findById(id: string): Promise<Activite | null> {
    const activite = await this.prisma.activite.findUnique({ where: { id } });
    return activite ? toDomain(activite) : null;
  }

  async save(entity: Activite): Promise<Activite> {
    const data = toPersistence(entity);
    const saved = await this.prisma.activite.upsert({
      where: { id: entity.id },
      create: data,
      update: data,
    });
    return toDomain(saved);
  }

  async findUpcoming(fromDate: string): Promise<Activite[]> {
    const activites = await this.prisma.activite.findMany({
      where: { date: { gte: fromDate } },
      orderBy: { date: 'asc' },
    });
    return activites.map(toDomain);
  }

  async deleteById(id: string): Promise<void> {
    try {
      await this.prisma.activite.delete({ where: { id } });
    } catch {
      throw new NotFoundException(`Activité ${id} introuvable`);
    }
  }

  async findByIdExterne(idExterne: string): Promise<Activite | null> {
    const activite = await this.prisma.activite.findUnique({ where: { idExterne } });
    return activite ? toDomain(activite) : null;
  }
}

function toDomain(row: ActiviteRow): Activite {
  return {
    id: row.id,
    date: row.date,
    heureConvocation: row.heureConvocation,
    heureDebut: row.heureDebut,
    label: row.label,
    type: row.type as TypeActivite,
    commentaire: row.commentaire ?? undefined,
    source: row.source as SourceActivite,
    idExterne: row.idExterne ?? undefined,
  };
}

function toPersistence(activite: Activite): {
  id: string;
  date: string;
  heureConvocation: string;
  heureDebut: string;
  label: string;
  type: TypeActivite;
  commentaire: string | null;
  source: SourceActivite;
  idExterne: string | null;
} {
  return {
    id: activite.id,
    date: activite.date,
    heureConvocation: activite.heureConvocation,
    heureDebut: activite.heureDebut,
    label: activite.label,
    type: activite.type,
    commentaire: activite.commentaire ?? null,
    source: activite.source,
    idExterne: activite.idExterne ?? null,
  };
}
