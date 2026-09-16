import { json } from "../http";
import { getPublicCapacity } from "../platformCapacity";
import type { ControlPlaneHandler } from "./types";

export const getPlatformCapacity: ControlPlaneHandler = async (_request, env) => {
  const capacity = await getPublicCapacity(env, env.KV);
  return json(capacity);
};
