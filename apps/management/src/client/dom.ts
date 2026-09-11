export function requiredElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`missing #${id}`);
  }
  return el as T;
}

export async function readJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}
