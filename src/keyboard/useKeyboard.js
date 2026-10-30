import { useEffect } from 'react';
import { useDispatch, useStore } from 'react-redux';
import { STAGES, UNDO_MESSAGES } from '../constants.js';
import { selectDisplayDeal } from '../store/selectors.js';
import {
  announced, focusChanged, rowsRefreshed, selectAllVisible, selectionCleared, selectionToggled,
} from '../store/uiSlice.js';
import { useEngine } from '../sync/EngineContext.js';
import { resolveKey } from './keymap.js';

function isTypingTarget(element) {
  if (element.tagName === 'SELECT' || element.tagName === 'TEXTAREA') return true;
  return element.tagName === 'INPUT' && element.type !== 'checkbox';
}

/** The single keydown listener for the whole screen. */
export function useKeyboard({ pickerOpen, confirmStage, setConfirmStage, setPickerOpen, setHelpOpen, moveToStage }) {
  const dispatch = useDispatch();
  const store = useStore();
  const { engine } = useEngine();

  useEffect(() => {
    function moveFocus(step) {
      const { rowIds, focusedId } = store.getState().ui;
      const next = rowIds[rowIds.indexOf(focusedId) + step];
      if (next) dispatch(focusChanged(next));
    }

    // Esc closes one layer at a time, so cancelling a dialog keeps the selection.
    function closeTopLayer() {
      if (pickerOpen || confirmStage) {
        setPickerOpen(false);
        setConfirmStage(null);
        return;
      }
      setHelpOpen(false);
      document.activeElement?.blur();
      dispatch(selectionCleared());
    }

    function nextStage() {
      const { stage } = selectDisplayDeal(store.getState(), store.getState().ui.focusedId);
      moveToStage(STAGES[Math.min(STAGES.indexOf(stage) + 1, STAGES.length - 1)]);
    }

    function run(action) {
      const state = store.getState();
      const { focusedId } = state.ui;
      if (action === 'down') moveFocus(1);
      if (action === 'up') moveFocus(-1);
      if (action === 'select' && focusedId) dispatch(selectionToggled(focusedId));
      if (action === 'selectAll') dispatch(selectAllVisible());
      if (action === 'move' && focusedId) setPickerOpen(true);
      if (action === 'search') document.getElementById('search').focus();
      if (action === 'undo') dispatch(announced(UNDO_MESSAGES[engine.undo()]));
      if (action === 'retry' && state.pending[focusedId]?.status === 'failed') engine.retry(focusedId);
      if (action === 'refresh') dispatch(rowsRefreshed());
      if (action === 'help') setHelpOpen((open) => !open);
      if (action === 'close') closeTopLayer();
      if (action === 'nextStage') nextStage();
      if (action.startsWith('stage:')) moveToStage(STAGES[Number(action.slice(6)) - 1]);
    }

    function onKeyDown(event) {
      const inInput = isTypingTarget(event.target);
      const action = resolveKey(event, { inInput, pickerOpen, confirmOpen: Boolean(confirmStage) });
      if (!action) return;
      event.preventDefault();
      run(action);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dispatch, store, engine, pickerOpen, confirmStage, setConfirmStage, setPickerOpen, setHelpOpen, moveToStage]);
}
