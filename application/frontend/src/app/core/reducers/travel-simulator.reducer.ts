/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */
import { createReducer, on } from '@ngrx/store';
import Long from 'long';
import { TravelSimulatorActions } from '../actions';

export const travelSimulatorKey = 'travelSimulator';

export interface State {
  time: number;
}

export const initialState: State = {
  time: 0,
};

export const reducer = createReducer(
  initialState,
  on(TravelSimulatorActions.setTime, (state, { time }) => ({ ...state, time }))
);
