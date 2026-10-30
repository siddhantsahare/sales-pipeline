import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import BulkBar from './components/BulkBar.jsx';
import DealTable from './components/DealTable.jsx';
import LiveRegion from './components/LiveRegion.jsx';
import ShortcutHelp from './components/ShortcutHelp.jsx';
import StagePicker from './components/StagePicker.jsx';
import StageStrip from './components/StageStrip.jsx';
import TopBar from './components/TopBar.jsx';
import { BULK_CONFIRM_ABOVE, STAGE_LABELS } from './constants.js';
import { useKeyboard } from './keyboard/useKeyboard.js';
import { selectionCleared } from './store/uiSlice.js';
import { useEngine } from './sync/EngineContext.js';

export default function App() {
  const dispatch = useDispatch();
  const store = useStore();
  const { engine } = useEngine();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [confirmStage, setConfirmStage] = useState(null);
  const confirmButton = useRef(null);
  const selectedCount = useSelector((state) => Object.keys(state.ui.selectedIds).length);

  const runBulkMove = useCallback((stage) => {
    setConfirmStage(null);
    engine.moveMany(Object.keys(store.getState().ui.selectedIds), stage);
    dispatch(selectionCleared());
  }, [dispatch, engine, store]);

  const moveToStage = useCallback((stage) => {
    setPickerOpen(false);
    const { selectedIds, focusedId } = store.getState().ui;
    const selected = Object.keys(selectedIds).length;
    if (selected === 0) engine.move(focusedId, stage);
    else if (selected > BULK_CONFIRM_ABOVE) setConfirmStage(stage);
    else runBulkMove(stage);
  }, [engine, store, runBulkMove]);

  useKeyboard({ pickerOpen, confirmStage, setConfirmStage, setPickerOpen, setHelpOpen, moveToStage });

  useEffect(() => {
    if (confirmStage) confirmButton.current.focus();
  }, [confirmStage]);

  return (
    <div className="app">
      <TopBar />
      <StageStrip />
      <DealTable />
      <BulkBar selectedCount={selectedCount} onMove={() => setPickerOpen(true)} />
      {pickerOpen && <StagePicker count={selectedCount || 1} onChoose={moveToStage} />}
      {confirmStage && (
        <div className="overlay" role="alertdialog" aria-label="Confirm bulk move">
          <p>Move {selectedCount.toLocaleString('en-IN')} deals to {STAGE_LABELS[confirmStage]}?</p>
          <button ref={confirmButton} onClick={() => runBulkMove(confirmStage)}>Move (Enter)</button>{' '}
          <button onClick={() => setConfirmStage(null)}>Cancel (Esc)</button>
        </div>
      )}
      {helpOpen && <ShortcutHelp />}
      <LiveRegion />
    </div>
  );
}
