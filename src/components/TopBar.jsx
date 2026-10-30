import { useDispatch, useSelector } from 'react-redux';
import { OWNERS } from '../constants.js';
import { selectFailedCount } from '../store/selectors.js';
import {
  currentUserChanged, filtersChanged, rowsRefreshed, viewChanged,
} from '../store/uiSlice.js';

const VIEWS = [['today', 'My deals today'], ['all', 'All deals']];

export default function TopBar() {
  const dispatch = useDispatch();
  const view = useSelector((state) => state.ui.view);
  const filters = useSelector((state) => state.ui.filters);
  const currentUser = useSelector((state) => state.ui.currentUser);
  const failedCount = useSelector(selectFailedCount);

  function apply(action) {
    dispatch(action);
    dispatch(rowsRefreshed());
  }

  return (
    <header className="top-bar">
      {VIEWS.map(([id, label]) => (
        <button key={id} aria-pressed={view === id} onClick={() => apply(viewChanged(id))}>{label}</button>
      ))}
      <input
        id="search"
        type="search"
        placeholder="Search company ( / )"
        aria-label="Search company"
        value={filters.search}
        onChange={(event) => apply(filtersChanged({ search: event.target.value }))}
      />
      <select
        aria-label="Owner"
        value={filters.owner}
        onChange={(event) => apply(filtersChanged({ owner: event.target.value }))}
      >
        <option value="">All owners</option>
        {OWNERS.map((name) => <option key={name}>{name}</option>)}
      </select>
      <label>
        <input
          type="checkbox"
          checked={filters.oldOnly}
          onChange={(event) => apply(filtersChanged({ oldOnly: event.target.checked }))}
        />
        Not touched in 90+ days
      </label>
      <label>
        <input
          type="checkbox"
          checked={filters.failedOnly}
          onChange={(event) => apply(filtersChanged({ failedOnly: event.target.checked }))}
        />
        Failed
      </label>
      {failedCount > 0 && (
        <button className="failed-count" onClick={() => apply(filtersChanged({ failedOnly: true }))}>
          {failedCount.toLocaleString('en-IN')} need attention
        </button>
      )}
      <label className="push-right">
        Viewing as{' '}
        <select value={currentUser} onChange={(event) => apply(currentUserChanged(event.target.value))}>
          {OWNERS.map((name) => <option key={name}>{name}</option>)}
        </select>
      </label>
    </header>
  );
}
