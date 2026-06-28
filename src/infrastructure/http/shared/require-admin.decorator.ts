import { SetMetadata } from "@nestjs/common";

export const REQUIRE_ADMIN_KEY = "requireAdmin";
export const RequireAdmin = (): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRE_ADMIN_KEY, true);
