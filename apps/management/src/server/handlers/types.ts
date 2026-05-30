import type { ManagementEnv } from "../env";

export type ControlPlaneHandler = (
  request: Request,
  env: ManagementEnv,
  segments: string[],
) => Promise<Response>;
