import { useDispatch, useSelector } from 'react-redux';
import { rowsRefreshed } from '../store/uiSlice.js';

export default function UpdatesPill() {
  const dispatch = useDispatch();
  const changedCount = useSelector((state) => Object.keys(state.ui.changedIds).length);
  if (changedCount === 0) return null;
  return (
    <button className="updates-pill" onClick={() => dispatch(rowsRefreshed())}>
      {changedCount.toLocaleString('en-IN')} changed · Refresh list <kbd>u</kbd>
    </button>
  );
}
