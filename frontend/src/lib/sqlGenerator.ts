import type { Column, DbModel, ForeignKey, Table } from '../types/model';

const quoteIdent = (value: string): string =>
  `"${value.replaceAll('"', '""')}"`;

const qualify = (schema: string, name: string): string =>
  `${quoteIdent(schema)}.${quoteIdent(name)}`;

const buildColumnDefinition = (column: Column): string => {
  const parts = [quoteIdent(column.name), column.type];
  if (!column.nullable) {
    parts.push('NOT NULL');
  }
  if (column.defaultValue && column.defaultValue.trim().length > 0) {
    parts.push(`DEFAULT ${column.defaultValue.trim()}`);
  }
  return parts.join(' ');
};

const buildForeignKeyClause = (
  fk: ForeignKey,
  table: Table,
  getTableById: (id: string) => Table | undefined,
  getSchemaName: (schemaId: string) => string,
): string | null => {
  const fromColumn = table.columns.find((column) => column.id === fk.fromColumnId);
  const targetTable = getTableById(fk.toTableId);
  if (!fromColumn || !targetTable) {
    return null;
  }

  const targetSchema = getSchemaName(targetTable.schemaId);
  const targetColumn = targetTable.columns.find(
    (column) => column.id === fk.toColumnId,
  );
  if (!targetColumn) {
    return null;
  }

  const clauses: string[] = [
    `CONSTRAINT ${quoteIdent(fk.name)} FOREIGN KEY (${quoteIdent(fromColumn.name)})`,
    `REFERENCES ${qualify(targetSchema, targetTable.name)} (${quoteIdent(targetColumn.name)})`,
  ];

  if (fk.onDelete) {
    clauses.push(`ON DELETE ${fk.onDelete}`);
  }
  if (fk.onUpdate) {
    clauses.push(`ON UPDATE ${fk.onUpdate}`);
  }

  return clauses.join(' ');
};

const buildTableStatement = (
  table: Table,
  schemaName: string,
  getTableById: (id: string) => Table | undefined,
  getSchemaName: (schemaId: string) => string,
): string => {
  const columnDefinitions = table.columns.map(buildColumnDefinition);
  const pkColumns = table.columns
    .filter((column) => column.isPrimaryKey)
    .map((column) => quoteIdent(column.name));

  if (pkColumns.length > 0) {
    columnDefinitions.push(`PRIMARY KEY (${pkColumns.join(', ')})`);
  }

  const uniqueColumns = table.columns
    .filter((column) => column.isUnique && !column.isPrimaryKey)
    .map((column) => quoteIdent(column.name));

  uniqueColumns.forEach((columnName) => {
    columnDefinitions.push(`UNIQUE (${columnName})`);
  });

  table.foreignKeys.forEach((fk) => {
    const clause = buildForeignKeyClause(fk, table, getTableById, getSchemaName);
    if (clause) {
      columnDefinitions.push(clause);
    }
  });

  const tableDefinition = `CREATE TABLE ${qualify(schemaName, table.name)} (\n  ${columnDefinitions.join(
    ',\n  ',
  )}\n);`;

  const comments: string[] = [];
  if (table.comment) {
    comments.push(
      `COMMENT ON TABLE ${qualify(schemaName, table.name)} IS '${table.comment.replaceAll("'", "''")}';`,
    );
  }
  table.columns.forEach((column) => {
    if (column.comment) {
      comments.push(
        `COMMENT ON COLUMN ${qualify(schemaName, table.name)}.${quoteIdent(column.name)} IS '${column.comment.replaceAll("'", "''")}';`,
      );
    }
  });

  return [tableDefinition, ...comments].join('\n');
};

export const generatePostgresSql = (model: DbModel): string => {
  const schemaById = new Map(model.schemas.map((schema) => [schema.id, schema.name]));
  const tableById = new Map(model.tables.map((table) => [table.id, table]));

  const statements: string[] = [];

  const sortedSchemas = [...model.schemas].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  sortedSchemas.forEach((schema) => {
    if (schema.name !== 'public') {
      statements.push(`CREATE SCHEMA IF NOT EXISTS ${quoteIdent(schema.name)};`);
    }
  });

  const typesBySchema = new Map<string, typeof model.types>();
  model.types.forEach((customType) => {
    const list = typesBySchema.get(customType.schemaId) ?? [];
    list.push(customType);
    typesBySchema.set(customType.schemaId, list);
  });

  typesBySchema.forEach((types, schemaId) => {
    const schemaName = schemaById.get(schemaId);
    if (!schemaName) {
      return;
    }

    types.forEach((customType) => {
      if (customType.kind === 'enum') {
        const values = customType.values
          .map((value) => `'${value.replaceAll("'", "''")}'`)
          .join(', ');
        statements.push(
          `CREATE TYPE ${qualify(schemaName, customType.name)} AS ENUM (${values});`,
        );
      }
    });
  });

  const tablesBySchema = new Map<string, Table[]>();
  model.tables.forEach((table) => {
    const group = tablesBySchema.get(table.schemaId) ?? [];
    group.push(table);
    tablesBySchema.set(table.schemaId, group);
  });

  sortedSchemas.forEach((schema) => {
    const tables = tablesBySchema.get(schema.id);
    if (!tables) {
      return;
    }

    tables
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((table) => {
        statements.push(
          buildTableStatement(
            table,
            schema.name,
            (id) => tableById.get(id),
            (schemaId) => schemaById.get(schemaId) ?? 'public',
          ),
        );
      });
  });

  return statements.join('\n\n');
};
