import { createContext, useContext } from 'react';

export const EngineContext = createContext(null);

/** Gives components the sync engine and the fake server. */
export function useEngine() {
  return useContext(EngineContext);
}
