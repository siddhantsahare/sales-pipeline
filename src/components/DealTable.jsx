import { useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useDispatch, useSelector } from 'react-redux';
import { ROW_HEIGHT } from '../constants.js';
import { listChanged, selectAllVisible, selectionCleared, sortChanged } from '../store/uiSlice.js';
import { useEngine } from '../sync/EngineContext.js';
import DealRow from './DealRow.jsx';

const COLUMNS = [
  ['reason', 'Why today', false],
  ['company', 'Company', true],
  ['value', 'Value', true],
  ['stage', 'Stage', true],
  ['owner', 'Owner', true],
  ['nextFollowUp', 'Follow-up', true],
  ['lastActivity', 'Last active', true],
  ['status', 'Save status', false],
];

export default function DealTable() {
  const dispatch = useDispatch();
  const { server } = useEngine();
  const rowIds = useSelector((state) => state.ui.rowIds);
  const focusedId = useSelector((state) => state.ui.focusedId);
  const scrollRequest = useSelector((state) => state.ui.scrollRequest);
  const sort = useSelector((state) => state.ui.sort);
  const selectedCount = useSelector((state) => Object.keys(state.ui.selectedIds).length);
  const allSelected = rowIds.length > 0 && selectedCount === rowIds.length;
  const scrollerRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: rowIds.length,
    getScrollElement: () => scrollerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });
  const items = virtualizer.getVirtualItems();
  const firstIndex = items[0]?.index ?? 0;
  const lastIndex = items.at(-1)?.index ?? 0;

  useEffect(() => {
    server.setVisibleIds(rowIds.slice(firstIndex, lastIndex + 1));
  }, [server, rowIds, firstIndex, lastIndex]);

  useEffect(() => {
    const index = rowIds.indexOf(focusedId);
    if (index >= 0) virtualizer.scrollToIndex(index, { align: 'auto' });
    // Not on every list change: a mouse user's scroll position must survive a refresh.
  }, [scrollRequest, virtualizer]);

  function toggleSort(key) {
    const dir = sort.key === key && sort.dir === 'asc' ? 'desc' : 'asc';
    dispatch(sortChanged({ key, dir }));
    dispatch(listChanged());
  }

  return (
    <main
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs"
      role="grid"
      aria-label="Deals"
      aria-rowcount={rowIds.length + 1}
      aria-activedescendant={focusedId ? `row-${focusedId}` : undefined}
    >
      <div
        className="deal-grid h-9 flex-none overflow-hidden border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500 [scrollbar-gutter:stable]"
        role="row"
      >
        <span role="columnheader">
          <input
            type="checkbox"
            className="check block"
            aria-label="Select all listed deals"
            checked={allSelected}
            onChange={() => dispatch(allSelected ? selectionCleared() : selectAllVisible())}
          />
        </span>
        {COLUMNS.map(([key, label, sortable]) => (
          <span key={key} role="columnheader" className={key === 'value' ? 'text-right' : undefined} aria-sort={sort.key === key ? `${sort.dir}ending` : 'none'}>
            {sortable ? <button className="truncate hover:text-slate-900" onClick={() => toggleSort(key)}>{label}</button> : label}
          </span>
        ))}
      </div>
      {rowIds.length === 0 && <p className="p-8 text-center text-slate-500">No deals match this view.</p>}
      <div className="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]" ref={scrollerRef}>
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {items.map((item) => (
            <DealRow key={rowIds[item.index]} dealId={rowIds[item.index]} index={item.index} start={item.start} />
          ))}
        </div>
      </div>
    </main>
  );
}
