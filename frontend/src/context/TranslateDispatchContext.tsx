import { createContext, useContext, type Dispatch } from 'react';
import type { TranslateAction } from '../reducers/translateReducer';

export const TranslateDispatchContext = createContext<Dispatch<TranslateAction>>(() => {
  throw new Error('useTranslateDispatch must be used within a TranslateStateProvider');
});

export function useTranslateDispatch(): Dispatch<TranslateAction> {
  return useContext(TranslateDispatchContext);
}
