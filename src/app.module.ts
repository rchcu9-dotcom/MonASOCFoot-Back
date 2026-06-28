import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./infrastructure/auth/auth.module";
import { ActivitesModule } from "./infrastructure/http/activite/activites.module";
import { DisponibilitesModule } from "./infrastructure/http/disponibilite/disponibilites.module";
import { AdminGuard } from "./infrastructure/http/shared/admin.guard";
import { AuthGuard } from "./infrastructure/http/shared/auth.guard";
import { UsersModule } from "./infrastructure/http/users/users.module";
import { PrismaModule } from "./infrastructure/persistence/prisma/prisma.module";

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    HealthModule,
    UsersModule,
    ActivitesModule,
    DisponibilitesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: AdminGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
