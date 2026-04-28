function sanitizeCategoryIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    )
  );
}

export function parseCategoryIds(
  value: string | null | undefined,
  fallbackCategoryId?: string | null
) {
  try {
    const parsed = value ? JSON.parse(value) : [];
    const normalized = sanitizeCategoryIds(parsed);
    if (normalized.length > 0) return normalized;
  } catch {
    // noop
  }

  return fallbackCategoryId ? [fallbackCategoryId] : [];
}

export function normalizeCategoryIds(
  value: unknown,
  fallbackCategoryId?: string | null
) {
  const normalized = sanitizeCategoryIds(value);
  if (normalized.length > 0) return normalized;
  return fallbackCategoryId ? [fallbackCategoryId] : [];
}

export function serializeCategoryIds(categoryIds: string[]) {
  const normalized = sanitizeCategoryIds(categoryIds);
  return normalized.length > 0 ? JSON.stringify(normalized) : null;
}

export function coercePostCategoryState(input: {
  categoryId?: string | null;
  categoryIds?: unknown;
}) {
  const categoryIds = normalizeCategoryIds(input.categoryIds, input.categoryId);
  return {
    categoryId: categoryIds[0] ?? null,
    categoryIds,
    categoryIdsJson: serializeCategoryIds(categoryIds),
  };
}

export function postHasCategory(
  post: {
    categoryId?: string | null;
    categoryIds?: string | null;
  },
  categoryId: string
) {
  const ids = parseCategoryIds(post.categoryIds, post.categoryId);
  return ids.includes(categoryId);
}
