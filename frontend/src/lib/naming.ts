const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const toSnakeCase = (value: string): string =>
  normalize(value)
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();

const ensurePrefix = (value: string): string =>
  /^[a-z_]/.test(value) ? value : `c_${value}`;

export const sanitizeConstraintName = (
  value: string | undefined,
  fallback: string,
): string => {
  const primary = toSnakeCase(value ?? '');
  if (primary) {
    return ensurePrefix(primary);
  }
  const fb = toSnakeCase(fallback) || 'constraint';
  return ensurePrefix(fb);
};

export const ensureUniqueConstraintName = (
  base: string,
  existing: Iterable<string>,
): string => {
  const used = new Set(existing);
  if (!used.has(base)) {
    return base;
  }
  let counter = 2;
  let candidate = `${base}_${counter}`;
  while (used.has(candidate)) {
    counter += 1;
    candidate = `${base}_${counter}`;
  }
  return candidate;
};

export const buildConstraintName = (
  parts: Array<string | undefined>,
  fallback: string,
): string => {
  const raw = parts.filter((part) => !!part && part.length > 0).join('_');
  return sanitizeConstraintName(raw, fallback);
};
