import { createReducer } from '@ngrx/store';
import Long from 'long';

export const travelSimulatorKey = 'travelSimulator';

export interface State {
  currentTime: Long;
}

export const initialState: State = {
  currentTime: Long.ZERO,
};

export const reducer = createReducer(initialState);
