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
      <span className="inline-flex items-center gap-1"><i className="bi bi-box-seam" aria-hidden="true" /> Schemas: <strong className="ml-1">{schemas}</strong></span>
      <span className="inline-flex items-center gap-1"><i className="bi bi-grid-3x3-gap" aria-hidden="true" /> Tabelas: <strong className="ml-1">{tables}</strong></span>
      <span className="inline-flex items-center gap-1"><i className="bi bi-columns" aria-hidden="true" /> Colunas: <strong className="ml-1">{columns}</strong></span>
      <span className="inline-flex items-center gap-1"><i className="bi bi-hash" aria-hidden="true" /> Índices: <strong className="ml-1">{indexes}</strong></span>
    </div>
    <div className="inline-flex items-center gap-2">
      <i className="bi bi-exclamation-triangle-fill text-amber-600" aria-hidden="true" />
      <span>Avisos: <span className="font-semibold text-amber-600">{warnings}</span></span>
    </div>
  </footer>
);
