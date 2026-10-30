import { beforeEach, expect, test } from 'vitest';
import { createAppStore } from '../../src/store/index.js';
import { rowsSet, selectAllVisible, selectionToggled } from '../../src/store/uiSlice.js';

let store;
const selected = () => Object.keys(store.getState().ui.selectedIds);

beforeEach(() => { store = createAppStore(); });

test('select all captures the IDs at that moment', () => {
  store.dispatch(rowsSet({ rowIds: ['a', 'b'], focusedId: 'a' }));
  store.dispatch(selectAllVisible());
  store.dispatch(rowsSet({ rowIds: ['a', 'b', 'c'], focusedId: 'a' }));
  expect(selected()).toEqual(['a', 'b']);
});

test('select all on an empty list selects nothing', () => {
  store.dispatch(selectAllVisible());
  expect(selected()).toEqual([]);
});

test('toggle adds and removes one ID', () => {
  store.dispatch(selectionToggled('a'));
  expect(selected()).toEqual(['a']);
  store.dispatch(selectionToggled('a'));
  expect(selected()).toEqual([]);
});
