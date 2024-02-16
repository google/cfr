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
import { ShipmentModelActions, TravelSimulatorActions } from '../actions';

export const travelSimulatorKey = 'travelSimulator';

export interface State {
  time: number;
}

export const initialState: State = {
  time: 0,
};

export const reducer = createReducer(
  initialState,
  on(TravelSimulatorActions.setTime, (state, { time }) => ({ ...state, time })),
  // Keep time selection within the global range
  on(ShipmentModelActions.setGlobalStartTime, (state, { globalStartTime }) => ({
    ...state,
    time: Math.max(Long.fromValue(globalStartTime).toNumber(), state.time),
  })),
  on(ShipmentModelActions.setGlobalEndTime, (state, { globalEndTime }) => ({
    ...state,
    time: Math.min(Long.fromValue(globalEndTime).toNumber(), state.time),
  })),
  on(ShipmentModelActions.setShipmentModel, (state, newState) => {
    let newTime = state.time;

    if (newState.globalStartTime) {
      newTime = Math.max(Long.fromValue(newState.globalStartTime).toNumber(), newTime);
    }

    if (newState.globalEndTime) {
      newTime = Math.min(Long.fromValue(newState.globalEndTime).toNumber(), newTime);
    }

    return {
      ...state,
      time: newTime,
    };
  })
);
