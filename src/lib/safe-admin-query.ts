export async function safeAdminQuery<T>(
  query: () => Promise<T>,
  fallback: T,
  label: string
): Promise<{ data: T; unavailable: boolean }> {
  try {
    const data = await query();
    return { data, unavailable: false };
  } catch (error) {
    console.error(`[admin] failed to load ${label}`, error);
    return { data: fallback, unavailable: true };
  }
}
