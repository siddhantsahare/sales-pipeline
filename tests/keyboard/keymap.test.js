import { expect, test } from 'vitest';
import { resolveKey } from '../../src/keyboard/keymap.js';

const table = { inInput: false, pickerOpen: false };

test('j and ArrowDown move down', () => {
  expect(resolveKey({ key: 'j' }, table)).toBe('down');
  expect(resolveKey({ key: 'ArrowDown' }, table)).toBe('down');
});

test('typing in the search box triggers no shortcut', () => {
  const typing = { inInput: true, pickerOpen: false };
  expect(resolveKey({ key: 'j' }, typing)).toBeNull();
  expect(resolveKey({ key: 'x' }, typing)).toBeNull();
  expect(resolveKey({ key: '/' }, typing)).toBeNull();
  expect(resolveKey({ key: 'a', ctrlKey: true }, typing)).toBeNull();
});

test('Ctrl+A and Ctrl+Z work in the table', () => {
  expect(resolveKey({ key: 'a', ctrlKey: true }, table)).toBe('selectAll');
  expect(resolveKey({ key: 'z', ctrlKey: true }, table)).toBe('undo');
});

test('a confirmation dialog blocks every shortcut except Escape', () => {
  const confirming = { inInput: false, pickerOpen: false, confirmOpen: true };
  expect(resolveKey({ key: 'j' }, confirming)).toBeNull();
  expect(resolveKey({ key: 'Escape' }, confirming)).toBe('close');
});

test('browser shortcuts like Ctrl+R are left alone', () => {
  expect(resolveKey({ key: 'r', ctrlKey: true }, table)).toBeNull();
});

test('Escape leaves the search box', () => {
  expect(resolveKey({ key: 'Escape' }, { inInput: true, pickerOpen: false })).toBe('close');
});

test('numbers choose stages only while the picker is open', () => {
  const picking = { inInput: false, pickerOpen: true };
  expect(resolveKey({ key: '3' }, picking)).toBe('stage:3');
  expect(resolveKey({ key: 'ArrowRight' }, picking)).toBe('nextStage');
  expect(resolveKey({ key: '8' }, picking)).toBeNull();
  expect(resolveKey({ key: 'j' }, picking)).toBeNull();
  expect(resolveKey({ key: '3' }, table)).toBeNull();
});
