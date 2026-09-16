export type PlatformStatus = {
  managementEnabled?: boolean;
  otpEnabled?: boolean;
  signupsState?: "open" | "paused" | "full";
  remaining?: number | null;
  webConfigEnabled?: boolean;
  emailConfigEnabled?: boolean;
};

export async function fetchPlatformStatus(apiBase: string): Promise<PlatformStatus | null> {
  const res = await fetch(`${apiBase}/api/v1/platform/status`);
  if (!res.ok) return null;
  return res.json() as Promise<PlatformStatus>;
}

export function managementUnavailableCopy(status: PlatformStatus | null): string | null {
  if (status?.managementEnabled === false) {
    return "The management app is temporarily unavailable.";
  }
  return null;
}

export function otpUnavailableCopy(status: PlatformStatus | null): string | null {
  if (status?.otpEnabled === false) {
    return "Sign-in is temporarily unavailable.";
  }
  return null;
}

export function webConfigUnavailableCopy(status: PlatformStatus | null): string | null {
  if (status?.webConfigEnabled === false) {
    return "Web changes are temporarily unavailable.";
  }
  return null;
}

export function emailConfigUnavailableCopy(status: PlatformStatus | null): string | null {
  if (status?.emailConfigEnabled === false) {
    return "Email changes are temporarily unavailable.";
  }
  return null;
}
