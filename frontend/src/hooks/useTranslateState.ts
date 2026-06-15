export { useTranslateState } from '../context/TranslateStateContext';

// Re-export all types from the reducer
export type {
  OutputMode,
  FileInputType,
  TranslateMode,
  PageRangePreset,
  JobStatus,
  JobHistoryEntry,
  TranslateState,
  TranslateAction,
} from '../reducers/translateReducer';
