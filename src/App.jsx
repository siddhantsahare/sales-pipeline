import { useCallback, useState } from 'react';
import { useSelector, useStore } from 'react-redux';
import DealTable from './components/DealTable.jsx';
import LiveRegion from './components/LiveRegion.jsx';
import ShortcutHelp from './components/ShortcutHelp.jsx';
import StagePicker from './components/StagePicker.jsx';
import StageStrip from './components/StageStrip.jsx';
import TopBar from './components/TopBar.jsx';
import { useKeyboard } from './keyboard/useKeyboard.js';
import { useEngine } from './sync/EngineContext.js';

export default function App() {
  const store = useStore();
  const { engine } = useEngine();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const selectedCount = useSelector((state) => Object.keys(state.ui.selectedIds).length);

  const moveToStage = useCallback((stage) => {
    setPickerOpen(false);
    engine.move(store.getState().ui.focusedId, stage);
  }, [engine, store]);

  useKeyboard({ pickerOpen, setPickerOpen, setHelpOpen, moveToStage });

  return (
    <div className="app">
      <TopBar />
      <StageStrip />
      <DealTable />
      {pickerOpen && <StagePicker count={selectedCount || 1} onChoose={moveToStage} />}
      {helpOpen && <ShortcutHelp />}
      <LiveRegion />
    </div>
  );
}
