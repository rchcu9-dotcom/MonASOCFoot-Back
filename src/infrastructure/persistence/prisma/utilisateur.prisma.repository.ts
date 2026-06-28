import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  Utilisateur as UtilisateurRow,
  RoleUtilisateur as PrismaRoleUtilisateur,
} from '@prisma/client';
import {
  ProviderUtilisateur,
  RoleUtilisateur,
  Utilisateur,
} from '../../../domain/utilisateur/entities/utilisateur.entity';
import { UtilisateurRepository } from '../../../domain/utilisateur/repositories/utilisateur.repository.interface';
import { PrismaService } from './prisma.service';

@Injectable()
export class UtilisateurPrismaRepository implements UtilisateurRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Utilisateur[]> {
    const utilisateurs = await this.prisma.utilisateur.findMany();
    return utilisateurs.map(toDomain);
  }

  async findById(id: string): Promise<Utilisateur | null> {
    const utilisateur = await this.prisma.utilisateur.findUnique({ where: { id } });
    return utilisateur ? toDomain(utilisateur) : null;
  }

  async save(entity: Utilisateur): Promise<Utilisateur> {
    const data = toPersistence(entity);
    const saved = await this.prisma.utilisateur.upsert({
      where: { id: entity.id },
      create: data,
      update: data,
    });
    return toDomain(saved);
  }

  async findByProviderId(providerId: string): Promise<Utilisateur | null> {
    const utilisateur = await this.prisma.utilisateur.findUnique({ where: { providerId } });
    return utilisateur ? toDomain(utilisateur) : null;
  }

  async updateRole(id: string, role: RoleUtilisateur): Promise<Utilisateur> {
    try {
      const updated = await this.prisma.utilisateur.update({
        where: { id },
        data: { role: role as PrismaRoleUtilisateur },
      });
      return toDomain(updated);
    } catch {
      throw new NotFoundException(`Utilisateur ${id} introuvable`);
    }
  }
}

function toDomain(row: UtilisateurRow): Utilisateur {
  return {
    id: row.id,
    providerId: row.providerId,
    provider: row.provider as ProviderUtilisateur,
    displayName: row.displayName,
    email: row.email,
    role: row.role as RoleUtilisateur,
    dateApparition: row.dateApparition,
    derniereConnexion: row.derniereConnexion,
  };
}

function toPersistence(utilisateur: Utilisateur): {
  id: string;
  providerId: string;
  provider: string;
  email: string;
  displayName: string;
  role: PrismaRoleUtilisateur;
  dateApparition: string;
  derniereConnexion: string;
} {
  return {
    id: utilisateur.id,
    providerId: utilisateur.providerId,
    provider: utilisateur.provider,
    email: utilisateur.email ?? '',
    displayName: utilisateur.displayName,
    role: utilisateur.role as PrismaRoleUtilisateur,
    dateApparition: utilisateur.dateApparition,
    derniereConnexion: utilisateur.derniereConnexion ?? utilisateur.dateApparition,
  };
}
