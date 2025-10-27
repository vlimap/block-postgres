import type { DbModel, Table } from '../types/model';
import { modelSchema } from './modelSchema';

export type IssueLevel = 'error' | 'warning';

export type ModelIssue = {
  level: IssueLevel;
  message: string;
};

const fieldLabels: Record<string, string> = {
  name: 'Nome',
  type: 'Tipo',
  comment: 'Comentário',
  defaultValue: 'Valor padrão',
  schemaId: 'Schema',
  columns: 'Colunas',
  foreignKeys: 'Relacionamentos',
  fromColumnId: 'Coluna de origem',
  toTableId: 'Tabela de destino',
  toColumnId: 'Coluna de destino',
  startCardinality: 'Cardinalidade (origem)',
  endCardinality: 'Cardinalidade (destino)',
  values: 'Valores',
};

const describePath = (path: PropertyKey[], model: DbModel): string => {
  const parts: string[] = [];

  let currentTable: Table | undefined;

  for (let index = 0; index < path.length; index += 1) {
    const segment = path[index];

    if (segment === 'schemas') {
      const next = path[index + 1];
      const schemaIndex =
        typeof next === 'number' ? next : Number.parseInt(String(next), 10);
      const schema = model.schemas[schemaIndex];
      parts.push(`Schema "${schema?.name ?? `#${schemaIndex + 1}`}"`);
      currentTable = undefined;
      index += 1;
      continue;
    }

    if (segment === 'tables') {
      const next = path[index + 1];
      const tableIndex =
        typeof next === 'number' ? next : Number.parseInt(String(next), 10);
      const table = model.tables[tableIndex];
      parts.push(`Tabela "${table?.name ?? `#${tableIndex + 1}`}"`);
      currentTable = table;
      currentTable = table;
      index += 1;
      continue;
    }

    if (segment === 'columns') {
      const next = path[index + 1];
      const columnIndex =
        typeof next === 'number' ? next : Number.parseInt(String(next), 10);
      const column = currentTable?.columns[columnIndex];
      parts.push(`Coluna "${column?.name ?? `#${columnIndex + 1}`}"`);
      index += 1;
      continue;
  }

  if (segment === 'foreignKeys') {
      const next = path[index + 1];
      const fkIndex =
        typeof next === 'number' ? next : Number.parseInt(String(next), 10);
      const fk = currentTable?.foreignKeys[fkIndex];
      parts.push(`Relacionamento "${fk?.name ?? `#${fkIndex + 1}`}"`);
      index += 1;
      continue;
    }

    if (segment === 'types') {
      const next = path[index + 1];
      const typeIndex =
        typeof next === 'number' ? next : Number.parseInt(String(next), 10);
      const type = model.types[typeIndex];
      parts.push(`Tipo "${type?.name ?? `#${typeIndex + 1}`}"`);
      currentTable = undefined;
      index += 1;
      continue;
    }

    if (typeof segment === 'number') {
      // handled alongside collection keys; ignore residual numeric segment
      continue;
    }

    const segmentKey =
      typeof segment === 'symbol'
        ? segment.description ?? segment.toString()
        : String(segment);

    const label =
      fieldLabels[segmentKey] ??
      segmentKey
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .trim()
        .replace(/^./, (char: string) => char.toUpperCase());

    if (label.length > 0) {
      parts.push(label);
    }
  }

  return parts.join(' → ') || 'Modelo';
};

export const collectModelIssues = (model: DbModel): ModelIssue[] => {
  const issues: ModelIssue[] = [];

  const parsed = modelSchema.safeParse(model);
  if (!parsed.success) {
    parsed.error.issues.forEach((issue) => {
      issues.push({
        level: 'error',
        message: `${describePath(issue.path, model)}: ${issue.message}`,
      });
    });
  }

  const tablesById = new Map(model.tables.map((table) => [table.id, table]));

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
        return;
      }

      const targetTable = tablesById.get(fk.toTableId);
      if (!targetTable) {
        issues.push({
          level: 'error',
          message: `Constraint "${fk.name}" referencia tabela inexistente (id: ${fk.toTableId}).`,
        });
        return;
      }

      const toColumn = targetTable.columns.find(
        (column) => column.id === fk.toColumnId,
      );

      if (!toColumn) {
        issues.push({
          level: 'error',
          message: `Constraint "${fk.name}" referencia coluna inexistente em "${targetTable.name}".`,
        });
        return;
      }

      const fromType = fromColumn.type?.trim().toLowerCase();
      const toType = toColumn.type?.trim().toLowerCase();
      if (fromType && toType && fromType !== toType) {
        issues.push({
          level: 'error',
          message: `Constraint "${fk.name}": tipo de "${table.name}.${fromColumn.name}" (${fromColumn.type}) difere de "${targetTable.name}.${toColumn.name}" (${toColumn.type}).`,
        });
      }
    });
  });

  return issues;
};
