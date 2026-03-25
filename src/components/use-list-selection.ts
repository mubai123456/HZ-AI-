"use client";

import { useMemo, useState } from "react";

export function useListSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedCount = selectedIds.length;
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  function replaceSelection(ids: string[]) {
    setSelectedIds(Array.from(new Set(ids)));
  }

  function toggleSelectAll(visibleItems: T[]) {
    const visibleIds = visibleItems.map((item) => item.id);
    const isAllVisibleSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedIdSet.has(id));

    if (isAllVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !visibleIds.includes(id)));
      return;
    }

    setSelectedIds((current) => Array.from(new Set([...current, ...visibleIds])));
  }

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIdSet.has(item.id)),
    [items, selectedIdSet],
  );

  return {
    selectedIds,
    selectedIdSet,
    selectedItems,
    selectedCount,
    toggleSelected,
    toggleSelectAll,
    clearSelection,
    replaceSelection,
  };
}
