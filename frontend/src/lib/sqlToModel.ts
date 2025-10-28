import type { Column, CustomType, DbModel, ForeignKey, Schema, Table } from '../types/model';

const GENERIC_PK_NAME = 'id';

const createId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const stripQuotes = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/""/g, '"');
  }
  return trimmed;
};

const stripSingleQuotes = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
};

type Statement = {
  text: string;
  startLine: number;
};

const splitStatements = (sql: string): Statement[] => {
  const statements: Statement[] = [];
  let current = '';
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let line = 1;
  let startLine = 1;

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    const next = sql[i + 1];

    current += char;

    if (!inDouble && char === "'" && next === "'") {
      current += next;
      i += 1;
      continue;
    }

    if (!inSingle && char === '"' && next === '"') {
      current += next;
      i += 1;
      continue;
    }

    if (!inDouble && char === "'" && !inSingle) {
      inSingle = true;
      continue;
    }
    if (inSingle && char === "'") {
      inSingle = false;
      continue;
    }
    if (!inSingle && char === '"' && !inDouble) {
      inDouble = true;
      continue;
    }
    if (inDouble && char === '"') {
      inDouble = false;
      continue;
    }

    if (inSingle || inDouble) {
      continue;
    }

    if (char === '(') depth += 1;
    if (char === ')') depth = Math.max(0, depth - 1);

    if (char === ';' && depth === 0) {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        statements.push({ text: trimmed, startLine });
      }
      current = '';
      startLine = line;
    }

    if (char === '\n') {
      line += 1;
      if (current.trim().length === 0) {
        startLine = line;
      }
    }
  }

  const final = current.trim();
  if (final.length > 0) {
    statements.push({ text: final, startLine });
  }

  return statements;
};

const splitDefinitionList = (body: string): string[] => {
  const items: string[] = [];
  let current = '';
  let depth = 0;
  for (let i = 0; i < body.length; i += 1) {
    const char = body[i];
    if (char === '(') depth += 1;
    if (char === ')') depth = Math.max(0, depth - 1);

    if (char === ',' && depth === 0) {
      items.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  const finale = current.trim();
  if (finale) items.push(finale);
  return items;
};

const parseQualifiedName = (value: string): [string, string] => {
  const cleaned = value.replace(/;$/g, '').trim();
  const parts = cleaned.split('.');
  if (parts.length === 2) {
    return [stripQuotes(parts[0]), stripQuotes(parts[1])];
  }
  if (parts.length === 1) {
    return ['public', stripQuotes(parts[0])];
  }
  const name = stripQuotes(parts.pop() ?? '');
  const schema = stripQuotes(parts.pop() ?? 'public');
  return [schema, name];
};

type TableDraft = {
  table: Table;
  columnsByName: Map<string, Column>;
  foreignKeysDraft: Array<{
    name: string;
    fromColumn: string;
    targetSchema: string;
    targetTable: string;
    targetColumn: string;
    onDelete?: ForeignKey['onDelete'];
    onUpdate?: ForeignKey['onUpdate'];
  }>;
};

export const sqlToModel = (sql: string): DbModel => {
  const schemas: Schema[] = [];
  const schemaByName = new Map<string, Schema>();
  const ensureSchema = (name: string): Schema => {
    const normalized = stripQuotes(name) || 'public';
    const existing = schemaByName.get(normalized);
    if (existing) return existing;
    const schema: Schema = { id: createId(), name: normalized };
    schemaByName.set(normalized, schema);
    schemas.push(schema);
    return schema;
  };

  ensureSchema('public');

  const tables: Table[] = [];
  const tableDrafts = new Map<string, TableDraft>();
  const types: CustomType[] = [];

  const tableComments = new Map<string, string>();
  const columnComments = new Map<string, string>();

  const statements = splitStatements(sql);

  statements.forEach(({ text: statement, startLine }) => {
    const sanitized = statement.replace(/^\s*--.*$/gm, '').trim();
    if (!sanitized) {
      return;
    }
    const lowered = sanitized.toLowerCase();
    if (lowered.startsWith('create schema')) {
      const match = sanitized.match(/create\s+schema\s+(?:if\s+not\s+exists\s+)?([^;]+)/i);
      if (match) {
        ensureSchema(match[1].trim());
      }
      return;
    }

    if (lowered.startsWith('create type')) {
      const match = sanitized.match(/create\s+type\s+([^\s]+)\s+as\s+enum\s*\(([^)]+)\)\s*;?$/i);
      if (!match) return;
      const qualified = match[1].trim();
      const [schemaName, typeName] = parseQualifiedName(qualified);
      const schema = ensureSchema(schemaName);
      const values = match[2]
        .split(',')
        .map((value) => stripSingleQuotes(value.trim()))
        .filter(Boolean);
      types.push({
        id: createId(),
        schemaId: schema.id,
        name: typeName,
        kind: 'enum',
        values,
      });
      return;
    }

    if (lowered.startsWith('create table')) {
      const headerMatch = sanitized.match(/create\s+table\s+([^\s]+)\s*\((.*)\)\s*;?$/is);
      if (!headerMatch) {
        throw new Error(`Linha ${startLine}: não foi possível interpretar o comando CREATE TABLE.`);
      }
      const qualified = headerMatch[1].trim();
      const body = headerMatch[2];
      const [schemaName, tableName] = parseQualifiedName(qualified);
      const schema = ensureSchema(schemaName);

      const table: Table = {
        id: createId(),
        schemaId: schema.id,
        name: tableName,
        comment: undefined,
        columns: [],
        foreignKeys: [],
      };

      const columnsByName = new Map<string, Column>();
      const fkDrafts: TableDraft['foreignKeysDraft'] = [];
      const definitions = splitDefinitionList(body);

      definitions.forEach((definitionRaw) => {
        const definition = definitionRaw.trim();
        if (definition.length === 0) return;

        if (/^primary\s+key/i.test(definition)) {
          const match = definition.match(/\(([^)]+)\)/);
          if (match) {
            match[1].split(',').forEach((col) => {
              const name = stripQuotes(col);
              const column = columnsByName.get(name);
              if (column) {
                column.isPrimaryKey = true;
                column.isUnique = true;
                column.nullable = false;
              }
            });
          }
          return;
        }

        if (/^unique/i.test(definition)) {
          const match = definition.match(/\(([^)]+)\)/);
          if (match) {
            match[1].split(',').forEach((col) => {
              const name = stripQuotes(col);
              const column = columnsByName.get(name);
              if (column && !column.isPrimaryKey) {
                column.isUnique = true;
              }
            });
          }
          return;
        }

        if (/^constraint/i.test(definition)) {
          const match = definition.match(/constraint\s+"?([^"]+)"?\s+foreign\s+key\s*\(([^)]+)\)\s+references\s+([^\s(]+)\s*\(([^)]+)\)(.*)/i);
          if (!match) {
            throw new Error(`Linha ${startLine}: constraint não reconhecida (${definition.trim()}).`);
          }
          const [, nameRaw, fromColsRaw, targetRaw, targetColsRaw, suffix] = match;
          const fromCol = stripQuotes(fromColsRaw.split(',')[0]);
          const targetQualified = targetRaw.trim();
          const [targetSchemaRaw, targetTableRaw] = targetQualified.split('.');
          const targetSchema = targetTableRaw ? stripQuotes(targetSchemaRaw) : 'public';
          const targetTable = targetTableRaw ? stripQuotes(targetTableRaw) : stripQuotes(targetSchemaRaw);
          const targetColumn = stripQuotes(targetColsRaw.split(',')[0]);
          const onDeleteMatch = suffix.match(/on\s+delete\s+(cascade|set\s+null|set\s+default|restrict|no\s+action)/i);
          const onUpdateMatch = suffix.match(/on\s+update\s+(cascade|set\s+null|set\s+default|restrict|no\s+action)/i);

          fkDrafts.push({
            name: stripQuotes(nameRaw),
            fromColumn: fromCol,
            targetSchema,
            targetTable,
            targetColumn,
            onDelete: onDeleteMatch ? (onDeleteMatch[1].toUpperCase() as ForeignKey['onDelete']) : undefined,
            onUpdate: onUpdateMatch ? (onUpdateMatch[1].toUpperCase() as ForeignKey['onUpdate']) : undefined,
          });
          return;
        }

        const columnMatch = definition.match(/"?([^"]+)"?\s+([^\s]+(?:\s*\([^)]*\))?)(.*)$/i);
        if (!columnMatch) {
          throw new Error(`Linha ${startLine}: não foi possível interpretar a coluna "${definition.trim()}".`);
        }
        const [, columnNameRaw, typeRaw, rest] = columnMatch;
        const columnName = stripQuotes(columnNameRaw);
        const type = typeRaw.trim();
        const nullable = !/not\s+null/i.test(rest);
        const defaultMatch = rest.match(/default\s+(.+)/i);

        const column: Column = {
          id: createId(),
          name: columnName,
          type,
          nullable,
          defaultValue: defaultMatch ? defaultMatch[1].trim() : undefined,
          isPrimaryKey: columnName === GENERIC_PK_NAME,
          isUnique: columnName === GENERIC_PK_NAME,
        };

        table.columns.push(column);
        columnsByName.set(columnName, column);
      });

      tables.push(table);
      tableDrafts.set(`${schemaName}.${tableName}`, {
        table,
        columnsByName,
        foreignKeysDraft: fkDrafts,
      });
      return;
    }

    if (lowered.startsWith('comment on table')) {
      const match = sanitized.match(/comment\s+on\s+table\s+([^\s]+)\s+is\s+(.+);?$/i);
      if (match) {
        const [schemaName, tableName] = parseQualifiedName(match[1].trim());
        tableComments.set(`${schemaName}.${tableName}`, stripSingleQuotes(match[2]));
      }
      return;
    }

    if (lowered.startsWith('comment on column')) {
      const match = sanitized.match(/comment\s+on\s+column\s+([^\s]+)\s+is\s+(.+);?$/i);
      if (match) {
        const cleaned = match[1].trim();
        const lastDot = cleaned.lastIndexOf('.');
        const tableQualified = cleaned.slice(0, lastDot);
        const columnIdent = cleaned.slice(lastDot + 1);
        const [schemaName, tableName] = parseQualifiedName(tableQualified);
        const columnName = stripQuotes(columnIdent);
        columnComments.set(`${schemaName}.${tableName}.${columnName}`, stripSingleQuotes(match[2]));
      }
      return;
    }
  });

  // Resolve FK references and apply comments.
  tableDrafts.forEach((draft, key) => {
    draft.foreignKeysDraft.forEach((fkDraft) => {
      const fromColumn = draft.columnsByName.get(fkDraft.fromColumn);
      const targetDraft = tableDrafts.get(`${fkDraft.targetSchema}.${fkDraft.targetTable}`);
      const targetColumn = targetDraft?.columnsByName.get(fkDraft.targetColumn);
      if (!fromColumn || !targetDraft || !targetColumn) {
        throw new Error(
          `Constraint "${fkDraft.name}" referencia objeto inexistente (${fkDraft.targetSchema}.${fkDraft.targetTable}.${fkDraft.targetColumn}).`)
        ;
      }
      const fk: ForeignKey = {
        id: createId(),
        name: fkDraft.name,
        fromColumnId: fromColumn.id,
        toTableId: targetDraft.table.id,
        toColumnId: targetColumn.id,
        onDelete: fkDraft.onDelete,
        onUpdate: fkDraft.onUpdate,
      };
      draft.table.foreignKeys.push(fk);
    });

    const commentKey = key;
    const tableComment = tableComments.get(commentKey);
    if (tableComment) {
      draft.table.comment = tableComment;
    }

    draft.table.columns.forEach((column) => {
      const comment = columnComments.get(`${commentKey}.${column.name}`);
      if (comment) {
        column.comment = comment;
      }
    });
  });

  return {
    version: 1,
    schemas,
    tables,
    types,
  };
};
