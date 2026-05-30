import type { ManagementEnv } from "../env";
import { createMemoryKv } from "./memoryKv";

export type SentEmail = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type TestEnvOptions = {
  sessionSecret?: string;
  captureEmail?: boolean;
  overrides?: Partial<ManagementEnv>;
};

const DEFAULT_SECRET = "test-session-secret-at-least-32-chars";

export function createTestEnv(options: TestEnvOptions = {}): {
  env: ManagementEnv;
  sentEmails: SentEmail[];
} {
  const sentEmails: SentEmail[] = [];
  const sessionSecret = options.sessionSecret ?? DEFAULT_SECRET;

  const env: ManagementEnv = {
    KV: createMemoryKv(),
    SESSION_SECRET: sessionSecret,
    OTP_FROM: "noreply@test.is-in.nz",
    OTP_SUBJECT: "Test sign-in code",
    ...options.overrides,
  };

  if (options.captureEmail !== false) {
    env.EMAIL = {
      send: async (message) => {
        const m = message as {
          from: string;
          to: string;
          subject: string;
          text?: string;
          html?: string;
        };
        sentEmails.push({
          from: m.from,
          to: m.to,
          subject: m.subject,
          text: m.text ?? "",
          html: m.html ?? "",
        });
        return {};
      },
    } as SendEmail;
  }

  return { env, sentEmails };
}
