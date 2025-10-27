import { useEffect } from 'react';

type KeyBindingsProps = {
  allNodeIds: string[];
  selectedNodeIds: string[];
  setSelectedNodeIds: (ids: string[]) => void;
  removeTable: (id: string) => void;
  selectedTableId: string | null;
  selectedColumnId: string | null;
  removeColumn: (tableId: string, columnId: string) => void;
};

export const KeyBindings = ({
  allNodeIds,
  selectedNodeIds,
  setSelectedNodeIds,
  removeTable,
  selectedTableId,
  selectedColumnId,
  removeColumn,
}: KeyBindingsProps) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // If the user is typing in a form control, don't intercept keys
      const tgt = e.target as HTMLElement | null;
      const active = (typeof document !== 'undefined' ? document.activeElement : null) as HTMLElement | null;
      const checkEl = tgt ?? active;
      if (checkEl) {
        const tag = checkEl.tagName?.toUpperCase();
        if (tag === 'INPUT' || tag === 'TEXTAREA' || checkEl.isContentEditable) {
          return;
        }
      }
      const mod = e.ctrlKey || e.metaKey;
      // Ctrl/Cmd + A -> select all
      if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelectedNodeIds([...allNodeIds]);
        return;
      }

      // Delete / Backspace -> remove selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedColumnId && selectedTableId) {
          removeColumn(selectedTableId, selectedColumnId);
          return;
        }
        if (selectedNodeIds.length > 0) {
          selectedNodeIds.forEach((id) => removeTable(id));
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    allNodeIds,
    selectedNodeIds,
    setSelectedNodeIds,
    removeTable,
    removeColumn,
    selectedColumnId,
    selectedTableId,
  ]);

  return null;
};

export default KeyBindings;
