import { useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useDispatch, useSelector } from 'react-redux';
import { ROW_HEIGHT } from '../constants.js';
import { rowsRefreshed, sortChanged } from '../store/uiSlice.js';
import { useEngine } from '../sync/EngineContext.js';
import DealRow from './DealRow.jsx';
import UpdatesPill from './UpdatesPill.jsx';

const COLUMNS = [
  ['reason', 'Why today', false],
  ['company', 'Company', true],
  ['value', 'Value', true],
  ['stage', 'Stage', true],
  ['owner', 'Owner', true],
  ['nextFollowUp', 'Next follow-up', true],
  ['lastActivity', 'Last activity', true],
  ['status', 'Save status', false],
];

export default function DealTable() {
  const dispatch = useDispatch();
  const { server } = useEngine();
  const rowIds = useSelector((state) => state.ui.rowIds);
  const focusedId = useSelector((state) => state.ui.focusedId);
  const sort = useSelector((state) => state.ui.sort);
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
  }, [focusedId, rowIds, virtualizer]);

  function toggleSort(key) {
    const dir = sort.key === key && sort.dir === 'asc' ? 'desc' : 'asc';
    dispatch(sortChanged({ key, dir }));
    dispatch(rowsRefreshed());
  }

  return (
    <main
      className="table"
      role="grid"
      aria-label="Deals"
      aria-rowcount={rowIds.length + 1}
      aria-activedescendant={focusedId ? `row-${focusedId}` : undefined}
    >
      <div className="row header" role="row">
        {COLUMNS.map(([key, label, sortable]) => (
          <span key={key} role="columnheader" aria-sort={sort.key === key ? `${sort.dir}ending` : 'none'}>
            {sortable ? <button onClick={() => toggleSort(key)}>{label}</button> : label}
          </span>
        ))}
      </div>
      {rowIds.length === 0 && <p className="empty">No deals match this view.</p>}
      <UpdatesPill />
      <div className="scroller" ref={scrollerRef}>
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {items.map((item) => (
            <DealRow key={rowIds[item.index]} dealId={rowIds[item.index]} index={item.index} start={item.start} />
          ))}
        </div>
      </div>
    </main>
  );
}
