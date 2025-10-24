import type { DbModel } from '../types/model';
import { modelSchema } from './modelSchema';

export type IssueLevel = 'error' | 'warning';

export type ModelIssue = {
  level: IssueLevel;
  message: string;
};

const formatPath = (path: PropertyKey[]): string =>
  path
    .map((segment) =>
      typeof segment === 'number' ? `[${segment}]` : String(segment),
    )
    .join('.')
    .replace(/\.\[/g, '[') || 'modelo';

export const collectModelIssues = (model: DbModel): ModelIssue[] => {
  const issues: ModelIssue[] = [];

  const parsed = modelSchema.safeParse(model);
  if (!parsed.success) {
    parsed.error.issues.forEach((issue) => {
      issues.push({
        level: 'error',
        message: `${formatPath(issue.path)}: ${issue.message}`,
      });
    });
  }

  model.tables.forEach((table) => {
    if (table.columns.length === 0) {
      issues.push({
        level: 'warning',
        message: `Tabela "${table.name}" não possui colunas.`,
      });
    }

    const pkColumns = table.columns.filter((column) => column.isPrimaryKey);
    if (pkColumns.length === 0) {
      issues.push({
        level: 'warning',
        message: `Tabela "${table.name}" não possui chave primária.`,
      });
    }

    table.foreignKeys.forEach((fk) => {
      const fromColumn = table.columns.find(
        (column) => column.id === fk.fromColumnId,
      );
      if (!fromColumn) {
        issues.push({
          level: 'warning',
          message: `Constraint "${fk.name}" referencia coluna inexistente em "${table.name}".`,
        });
      }
    });
  });

  return issues;
};
