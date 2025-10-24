import { useEffect, useMemo, useState } from 'react';
import { POSTGRES_TYPES } from '../constants/postgresTypes';
import type { ReferentialAction } from '../types/model';
import { createEnumType, useModelStore } from '../store/modelStore';

type SidebarTab = 'tables' | 'types';

const controlButton =
  'inline-flex h-6 w-6 items-center justify-center rounded border border-transparent text-slate-500 transition hover:border-slate-300 hover:bg-slate-200 hover:text-slate-700';

const segmentedButton =
  'inline-flex flex-1 items-center justify-center rounded-md px-3 py-1.5 text-sm font-semibold';

const smallButton =
  'inline-flex items-center rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60';

const formInput =
  'w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200';

const formSelect =
  'w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200';

const referentialActions: ReferentialAction[] = [
  'NO ACTION',
  'RESTRICT',
  'CASCADE',
  'SET NULL',
  'SET DEFAULT',
];

export const Sidebar = () => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('tables');

  const model = useModelStore((state) => state.model);
  const selectedSchemaId = useModelStore((state) => state.selectedSchemaId);
  const selectedTableId = useModelStore((state) => state.selectedTableId);
  const selectedColumnId = useModelStore((state) => state.selectedColumnId);
  const setSelectedSchemaId = useModelStore((state) => state.setSelectedSchemaId);
  const setSelectedTableId = useModelStore((state) => state.setSelectedTableId);
  const setSelectedColumnId = useModelStore((state) => state.setSelectedColumnId);
  const addSchema = useModelStore((state) => state.addSchema);
  const updateSchema = useModelStore((state) => state.updateSchema);
  const removeSchema = useModelStore((state) => state.removeSchema);
  const addTable = useModelStore((state) => state.addTable);
  const updateTable = useModelStore((state) => state.updateTable);
  const removeTable = useModelStore((state) => state.removeTable);
  const addColumn = useModelStore((state) => state.addColumn);
  const updateColumn = useModelStore((state) => state.updateColumn);
  const removeColumn = useModelStore((state) => state.removeColumn);
  const addForeignKey = useModelStore((state) => state.addForeignKey);
  const updateForeignKey = useModelStore((state) => state.updateForeignKey);
  const removeForeignKey = useModelStore((state) => state.removeForeignKey);
  const addType = useModelStore((state) => state.addType);
  const updateType = useModelStore((state) => state.updateType);
  const removeType = useModelStore((state) => state.removeType);

  const activeSchemaId = useMemo(() => {
    if (selectedSchemaId) {
      return selectedSchemaId;
    }
    return model.schemas[0]?.id ?? null;
  }, [model.schemas, selectedSchemaId]);

  useEffect(() => {
    if (!selectedSchemaId && model.schemas[0]) {
      setSelectedSchemaId(model.schemas[0].id);
    }
  }, [model.schemas, selectedSchemaId, setSelectedSchemaId]);

  const tablesInSchema = useMemo(
    () =>
      model.tables.filter((table) => table.schemaId === activeSchemaId),
    [model.tables, activeSchemaId],
  );

  useEffect(() => {
    if (selectedTableId) {
      const exists = model.tables.some((table) => table.id === selectedTableId);
      if (!exists) {
        setSelectedTableId(tablesInSchema[0]?.id ?? null);
      }
    } else if (tablesInSchema[0]) {
      setSelectedTableId(tablesInSchema[0].id);
    }
  }, [model.tables, selectedTableId, setSelectedTableId, tablesInSchema]);

  const selectedTable = useMemo(
    () => model.tables.find((table) => table.id === selectedTableId) ?? null,
    [model.tables, selectedTableId],
  );

  const schemaOptions = useMemo(
    () =>
      model.schemas.map((schema) => ({ id: schema.id, name: schema.name })),
    [model.schemas],
  );

  const handleAddSchema = () => {
    const name = prompt('Nome do schema:', 'novo_schema');
    if (!name) {
      return;
    }
    addSchema(name);
  };

  const handleAddTable = () => {
    if (!activeSchemaId) {
      return;
    }
    const name = prompt('Nome da tabela:', 'tabela');
    addTable(activeSchemaId, name ?? 'tabela');
  };

  const handleAddColumn = () => {
    if (!selectedTable) {
      return;
    }
    addColumn(selectedTable.id, `coluna_${selectedTable.columns.length + 1}`);
  };

  const handleAddForeignKey = () => {
    if (!selectedTable) {
      return;
    }
    if (selectedTable.columns.length === 0) {
      alert('Crie ao menos uma coluna antes de adicionar uma FK.');
      return;
    }

    const availableTables = model.tables.filter(
      (table) => table.id !== selectedTable.id && table.columns.length > 0,
    );
    if (availableTables.length === 0) {
      alert('Não há tabelas alvo com colunas disponíveis para criar FK.');
      return;
    }

    const targetTable = availableTables[0];
    const targetColumn = targetTable.columns[0];

    addForeignKey(selectedTable.id, {
      name: `fk_${selectedTable.name}_${targetTable.name}`,
      fromColumnId: selectedTable.columns[0].id,
      toTableId: targetTable.id,
      toColumnId: targetColumn.id,
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    });
  };

  const handleAddEnum = () => {
    if (!activeSchemaId) {
      return;
    }
    const name = prompt('Nome do tipo ENUM:', 'status_enum');
    if (!name) {
      return;
    }
    const valuesInput = prompt(
      'Valores (separados por vírgula):',
      'ativo,inativo',
    );
    if (!valuesInput) {
      return;
    }
    const values = valuesInput
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (values.length === 0) {
      alert('Adicione ao menos um valor.');
      return;
    }
    addType(createEnumType(activeSchemaId, name, values));
  };

  return (
    <aside className="flex w-80 flex-col border-r border-slate-200 bg-slate-50">
      <div className="flex gap-2 p-3">
        <button
          type="button"
          className={`${segmentedButton} ${
            activeTab === 'tables'
              ? 'bg-white text-indigo-600 shadow'
              : 'bg-slate-100 text-slate-600'
          }`}
          onClick={() => setActiveTab('tables')}
        >
          Tabela
        </button>
        <button
          type="button"
          className={`${segmentedButton} ${
            activeTab === 'types'
              ? 'bg-white text-indigo-600 shadow'
              : 'bg-slate-100 text-slate-600'
          }`}
          onClick={() => setActiveTab('types')}
        >
          Tipos
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {activeTab === 'tables' ? (
          <div className="space-y-6">
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Schemas
                </h2>
                <button
                  type="button"
                  className={controlButton}
                  onClick={handleAddSchema}
                  title="Adicionar schema"
                >
                  +
                </button>
              </div>
              <div className="space-y-3">
                {model.schemas.map((schema) => (
                  <div
                    key={schema.id}
                    className={`rounded-md border ${
                      schema.id === activeSchemaId
                        ? 'border-indigo-400 bg-white shadow-sm'
                        : 'border-transparent bg-slate-100'
                    } p-2`}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        className="text-sm font-semibold text-slate-700"
                        onClick={() => setSelectedSchemaId(schema.id)}
                      >
                        {schema.name}
                      </button>
                      <button
                        type="button"
                        className={controlButton}
                        onClick={() => removeSchema(schema.id)}
                        disabled={model.schemas.length <= 1}
                        title="Remover schema"
                      >
                        ×
                      </button>
                    </div>
                    <input
                      className={`${formInput} mt-2`}
                      value={schema.name}
                      onChange={(event) =>
                        updateSchema(schema.id, {
                          name: event.target.value,
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tabelas
                </h2>
                <button
                  type="button"
                  className={controlButton}
                  onClick={handleAddTable}
                  title="Adicionar tabela"
                  disabled={!activeSchemaId}
                >
                  +
                </button>
              </div>
              <div className="space-y-2">
                {tablesInSchema.length === 0 && (
                  <p className="text-sm text-slate-500">
                    Nenhuma tabela neste schema.
                  </p>
                )}
                {tablesInSchema.map((table) => (
                  <button
                    key={table.id}
                    type="button"
                    className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium transition ${
                      table.id === selectedTableId
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                    onClick={() => setSelectedTableId(table.id)}
                  >
                    {table.name}
                  </button>
                ))}
              </div>
            </section>

            {selectedTable && (
              <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">
                    {selectedTable.name}
                  </h3>
                  <button
                    type="button"
                    className={smallButton}
                    onClick={() => removeTable(selectedTable.id)}
                  >
                    <i className="bi bi-trash3 mr-1" aria-hidden="true" />
                    Remover
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Nome
                    </label>
                    <input
                      className={formInput}
                      value={selectedTable.name}
                      onChange={(event) =>
                        updateTable(selectedTable.id, {
                          name: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Comentário
                    </label>
                    <textarea
                      className={`${formInput} min-h-[60px]`}
                      value={selectedTable.comment ?? ''}
                      onChange={(event) =>
                        updateTable(selectedTable.id, {
                          comment: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Colunas
                    </h4>
                    <button
                      type="button"
                      className={smallButton}
                      onClick={handleAddColumn}
                    >
                      <i className="bi bi-plus-lg mr-1" aria-hidden="true" />
                      Adicionar coluna
                    </button>
                  </div>
                  <div className="space-y-3">
                    {selectedTable.columns.map((column) => {
                      const isActiveColumn = selectedColumnId === column.id;
                      return (
                        <div
                          key={column.id}
                          className={`rounded border p-3 transition ${
                            isActiveColumn
                              ? 'border-indigo-400 bg-indigo-50/70'
                              : 'border-slate-200 bg-white'
                          }`}
                          onClick={() => {
                            setSelectedTableId(selectedTable.id);
                            setSelectedColumnId(column.id);
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <input
                              className={formInput}
                              value={column.name}
                              onChange={(event) =>
                                updateColumn(selectedTable.id, column.id, {
                                  name: event.target.value,
                                })
                              }
                            />
                            <button
                              type="button"
                              className={controlButton}
                              onClick={(event) => {
                                event.stopPropagation();
                                removeColumn(selectedTable.id, column.id);
                              }}
                              title="Remover coluna"
                            >
                              <i className="bi bi-x-lg" aria-hidden="true" />
                            </button>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <select
                              className={formSelect}
                              value={column.type}
                              onChange={(event) =>
                                updateColumn(selectedTable.id, column.id, {
                                  type: event.target.value,
                                })
                              }
                            >
                              <option value="">Selecione um tipo</option>
                              {POSTGRES_TYPES.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                            <input
                              className={formInput}
                              placeholder="DEFAULT"
                              value={column.defaultValue ?? ''}
                              onChange={(event) =>
                                updateColumn(selectedTable.id, column.id, {
                                  defaultValue:
                                    event.target.value.length > 0
                                      ? event.target.value
                                      : undefined,
                                })
                              }
                            />
                          </div>
                          <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                            <label className="inline-flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={column.nullable}
                                onChange={(event) =>
                                  updateColumn(selectedTable.id, column.id, {
                                    nullable: event.target.checked,
                                  })
                                }
                              />
                              <span>Nullable</span>
                            </label>
                            <label className="inline-flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={column.isPrimaryKey}
                                onChange={(event) =>
                                  updateColumn(selectedTable.id, column.id, {
                                    isPrimaryKey: event.target.checked,
                                    nullable: event.target.checked
                                      ? false
                                      : column.nullable,
                                  })
                                }
                              />
                              <span>PK</span>
                            </label>
                            <label className="inline-flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={column.isUnique}
                                onChange={(event) =>
                                  updateColumn(selectedTable.id, column.id, {
                                    isUnique: event.target.checked,
                                  })
                                }
                              />
                              <span>Unique</span>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Foreign keys
                    </h4>
                    <button
                      type="button"
                      className={smallButton}
                      onClick={handleAddForeignKey}
                    >
                      <i className="bi bi-plus-lg mr-1" aria-hidden="true" />
                      Nova FK
                    </button>
                  </div>
                  <div className="space-y-3">
                    {selectedTable.foreignKeys.length === 0 && (
                      <p className="text-sm text-slate-500">
                        Nenhuma foreign key definida.
                      </p>
                    )}
                    {selectedTable.foreignKeys.map((fk) => {
                      const targetTable = model.tables.find(
                        (table) => table.id === fk.toTableId,
                      );
                      const targetColumns = targetTable?.columns ?? [];

                      return (
                        <div
                          key={fk.id}
                          className="rounded border border-slate-200 p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <input
                              className={formInput}
                              value={fk.name}
                              onChange={(event) =>
                                updateForeignKey(selectedTable.id, fk.id, {
                                  name: event.target.value,
                                })
                              }
                            />
                            <button
                              type="button"
                              className={controlButton}
                              onClick={() =>
                                removeForeignKey(selectedTable.id, fk.id)
                              }
                              title="Remover FK"
                            >
                              ×
                            </button>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <select
                              className={formSelect}
                              value={fk.fromColumnId}
                              onChange={(event) =>
                                updateForeignKey(selectedTable.id, fk.id, {
                                  fromColumnId: event.target.value,
                                })
                              }
                            >
                              {selectedTable.columns.map((column) => (
                                <option key={column.id} value={column.id}>
                                  {column.name}
                                </option>
                              ))}
                            </select>
                            <select
                              className={formSelect}
                              value={fk.toTableId}
                              onChange={(event) => {
                                const newTargetId = event.target.value;
                                const newTargetTable = model.tables.find(
                                  (table) => table.id === newTargetId,
                                );
                                updateForeignKey(selectedTable.id, fk.id, {
                                  toTableId: newTargetId,
                                  toColumnId:
                                    newTargetTable?.columns[0]?.id ??
                                    fk.toColumnId,
                                });
                              }}
                            >
                              {model.tables
                                .filter((table) => table.id !== selectedTable.id)
                                .map((table) => (
                                  <option key={table.id} value={table.id}>
                                    {table.name}
                                  </option>
                                ))}
                            </select>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <select
                              className={formSelect}
                              value={fk.toColumnId}
                              onChange={(event) =>
                                updateForeignKey(selectedTable.id, fk.id, {
                                  toColumnId: event.target.value,
                                })
                              }
                            >
                              {targetColumns.map((column) => (
                                <option key={column.id} value={column.id}>
                                  {column.name}
                                </option>
                              ))}
                            </select>
                            <select
                              className={formSelect}
                              value={fk.onDelete ?? 'NO ACTION'}
                              onChange={(event) =>
                                updateForeignKey(selectedTable.id, fk.id, {
                                  onDelete: event.target
                                    .value as ReferentialAction,
                                })
                              }
                            >
                              {referentialActions.map((action) => (
                                <option key={action} value={action}>
                                  ON DELETE {action}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="mt-2">
                            <select
                              className={formSelect}
                              value={fk.onUpdate ?? 'NO ACTION'}
                              onChange={(event) =>
                                updateForeignKey(selectedTable.id, fk.id, {
                                  onUpdate: event.target
                                    .value as ReferentialAction,
                                })
                              }
                            >
                              {referentialActions.map((action) => (
                                <option key={action} value={action}>
                                  ON UPDATE {action}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tipos personalizados
              </h2>
              <button
                type="button"
                className={smallButton}
                onClick={handleAddEnum}
                disabled={!activeSchemaId}
              >
                Novo ENUM
              </button>
            </div>
            {model.types.length === 0 && (
              <p className="text-sm text-slate-500">
                Nenhum tipo cadastrado. Adicione tipos ENUM para reutilizar em
                colunas.
              </p>
            )}
            <div className="space-y-3">
              {model.types.map((customType) => (
                <div
                  key={customType.id}
                  className="rounded border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">
                      {customType.name}
                    </h3>
                    <button
                      type="button"
                      className={smallButton}
                      onClick={() => removeType(customType.id)}
                    >
                      Remover
                    </button>
                  </div>
                  <div className="mt-3 space-y-3 text-sm">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Nome
                      </label>
                      <input
                        className={formInput}
                        value={customType.name}
                        onChange={(event) =>
                          updateType(customType.id, {
                            name: event.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Schema
                      </label>
                      <select
                        className={formSelect}
                        value={customType.schemaId}
                        onChange={(event) =>
                          updateType(customType.id, {
                            schemaId: event.target.value,
                          })
                        }
                      >
                        {schemaOptions.map((schema) => (
                          <option key={schema.id} value={schema.id}>
                            {schema.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Valores (um por linha)
                      </label>
                      <textarea
                        className={`${formInput} min-h-[80px]`}
                        value={customType.values.join('\n')}
                        onChange={(event) =>
                          updateType(customType.id, {
                            values: event.target.value
                              .split('\n')
                              .map((value) => value.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
