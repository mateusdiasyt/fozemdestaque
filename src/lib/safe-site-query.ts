export async function safeSiteQuery<T>(query: () => Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await query();
  } catch (error) {
    console.error(`[site] failed to load ${label}`, error);
    return fallback;
  }
}
