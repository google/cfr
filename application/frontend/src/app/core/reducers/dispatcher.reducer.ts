/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import { createReducer, on } from '@ngrx/store';
import { DispatcherActions } from '../actions';
import { IOptimizeToursResponse, Scenario, Solution } from '../models';

const defaultScenarioName = 'Untitled scenario';

export const dispatcherFeatureKey = 'dispatcher';

export interface State {
  /** Scenario without modifications a.k.a. pristine scenario except when replaced by chaos */
  scenario?: Scenario;
  /** Current solution */
  solution?: Solution;
  /** Elapsed time the current solution took */
  solutionTime?: number;
  /** Time the current solution was initiated */
  batchTime?: number;
  /** Time the current solution was received */
  timeOfResponse?: number;
  //* User-friendly name of the scenario /
  scenarioName?: string;
}

export const initialState: State = {
  scenario: null,
  solution: null,
  solutionTime: null,
  batchTime: null,
  scenarioName: defaultScenarioName,
};

export const reducer = createReducer(
  initialState,
  on(DispatcherActions.loadSolution, (state, { elapsedSolution }) => ({
    ...state,
    solution: elapsedSolution.solution,
    solutionTime: elapsedSolution.elapsedTime,
    timeOfResponse: elapsedSolution.timeOfResponse,
    batchTime: elapsedSolution.batchTime,
  })),
  on(DispatcherActions.uploadScenarioSuccess, (state, { scenario, scenarioName }) => ({
    ...initialState,
    scenario,
    scenarioName: scenarioName ?? defaultScenarioName,
  })),
  on(DispatcherActions.clearSolution, (state, _) => ({
    ...initialState,
    scenario: state.scenario,
  })),
  on(DispatcherActions.saveScenarioName, (state, { scenarioName }) => ({ ...state, scenarioName }))
);

export const selectScenario = (state: State): Scenario => state.scenario;

export const selectSolution = (state: State): IOptimizeToursResponse => state.solution;

export const selectSolutionTime = (state: State): number => state.solutionTime;

export const selectTimeOfResponse = (state: State): number => state.timeOfResponse;

export const selectBatchTime = (state: State): number => state.batchTime;

export const selectScenarioName = (state: State): string => state.scenarioName;
