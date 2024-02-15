import { createReducer } from '@ngrx/store';

export const travelSimulatorKey = 'travelSimulator';

export interface State {}

export const initialState: State = {};

export const reducer = createReducer(initialState);
