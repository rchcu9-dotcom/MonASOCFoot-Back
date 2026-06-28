import { Injectable } from "@nestjs/common";

export interface HealthPayload {
  status: "ok";
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
}

@Injectable()
export class HealthService {
  check(): HealthPayload {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version ?? "unknown",
      environment: process.env.NODE_ENV ?? "development",
    };
  }
}
