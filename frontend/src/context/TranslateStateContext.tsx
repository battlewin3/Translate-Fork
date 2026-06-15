import { createContext, useContext } from 'react';
import type { TranslateState } from '../reducers/translateReducer';
import { initialState } from '../reducers/translateReducer';

export const TranslateStateContext = createContext<TranslateState>(initialState);

export function useTranslateState(): TranslateState {
  return useContext(TranslateStateContext);
}
