import { afterEach, beforeEach, vi } from "vitest";
import type { ManagementEnv } from "../env.js";
import { createTestEnv, type SentEmail } from "./testEnv.js";

export const TEST_EMAIL = "user@example.com";
export const OTHER_EMAIL = "other@example.com";
export const TEST_SUB = "myalias";

export type ControlPlaneTestContext = {
  env: ManagementEnv;
  sentEmails: SentEmail[];
};

export function useControlPlaneTest(): {
  readonly env: ManagementEnv;
  readonly sentEmails: SentEmail[];
} {
  const ctx = {} as ControlPlaneTestContext;
  beforeEach(() => {
    const created = createTestEnv();
    ctx.env = created.env;
    ctx.sentEmails = created.sentEmails;
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });
  return {
    get env() {
      return ctx.env;
    },
    get sentEmails() {
      return ctx.sentEmails;
    },
  };
}
