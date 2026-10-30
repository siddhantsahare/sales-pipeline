import { useDispatch, useSelector } from 'react-redux';
import { rowsRefreshed } from '../store/uiSlice.js';

export default function UpdatesPill() {
  const dispatch = useDispatch();
  const updateCount = useSelector((state) => state.ui.updateCount);
  if (updateCount === 0) return null;
  return (
    <button className="updates-pill" onClick={() => dispatch(rowsRefreshed())}>
      {updateCount.toLocaleString('en-IN')} updates · press <kbd>u</kbd> to refresh
    </button>
  );
}
