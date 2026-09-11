/** Public sites and UI copy use this suffix (e.g. `josh.is-in.nz` or `josh.test.is-in.nz`). */
export const ROOT_DOMAIN = import.meta.env.PUBLIC_ROOT_DOMAIN ?? "is-in.nz";
export const PRODUCT_NAME = import.meta.env.PUBLIC_PRODUCT_NAME ?? ROOT_DOMAIN;

export function siteFqdn(subdomain: string): string {
  return `${subdomain}.${ROOT_DOMAIN}`;
}
