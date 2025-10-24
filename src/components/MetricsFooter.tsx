type MetricsFooterProps = {
  schemas: number;
  tables: number;
  columns: number;
  indexes: number;
  warnings: number;
};

export const MetricsFooter = ({
  schemas,
  tables,
  columns,
  indexes,
  warnings,
}: MetricsFooterProps) => (
  <footer className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-2 text-xs font-medium text-slate-600">
    <div className="flex gap-4">
      <span>Schemas: {schemas}</span>
      <span>Tabelas: {tables}</span>
      <span>Colunas: {columns}</span>
      <span>Índices: {indexes}</span>
    </div>
    <div>
      Warnings: <span className="font-semibold text-amber-600">{warnings}</span>
    </div>
  </footer>
);
