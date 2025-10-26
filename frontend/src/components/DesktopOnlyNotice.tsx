import { useEffect, useState } from 'react';

export const DesktopOnlyNotice = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(max-width: 1024px)');
    const update = () => setIsMobile(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  if (!isMobile) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/95 px-6 text-center text-white">
      <div className="max-w-md space-y-4">
        <h2 className="text-2xl font-semibold">Use em um computador</h2>
        <p className="text-sm text-slate-200">
          O PG Modeler foi criado para modelar diagramas ER/DER com uma interface ampla, ideal para <strong>notebooks ou desktops</strong>.
          Para ter a melhor experiência, acesse novamente em um dispositivo com tela maior.
        </p>
        <p className="text-xs text-slate-400">
          Se precisar abrir os arquivos pelo celular, use um modo desktop do navegador, sabendo que alguns recursos podem não funcionar bem.
        </p>
      </div>
    </div>
  );
};
