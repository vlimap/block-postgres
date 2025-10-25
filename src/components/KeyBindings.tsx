import { useEffect } from 'react';

type KeyBindingsProps = {
  allNodeIds: string[];
  selectedNodeIds: string[];
  setSelectedNodeIds: (ids: string[]) => void;
  removeTable: (id: string) => void;
};

export const KeyBindings = ({
  allNodeIds,
  selectedNodeIds,
  setSelectedNodeIds,
  removeTable,
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
        if (selectedNodeIds.length > 0) {
          selectedNodeIds.forEach((id) => removeTable(id));
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [allNodeIds, selectedNodeIds, setSelectedNodeIds, removeTable]);

  return null;
};

export default KeyBindings;
