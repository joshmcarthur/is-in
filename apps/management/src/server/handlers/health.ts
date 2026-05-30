import { json } from "../http";
import type { ControlPlaneHandler } from "./types";

export const getHealth: ControlPlaneHandler = async () => {
  return json({ ok: true });
};
