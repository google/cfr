/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import * as fromDispatcher from '../reducers/dispatcher.reducer';

export const selectDispatcherState = createFeatureSelector<fromDispatcher.State>(
  fromDispatcher.dispatcherFeatureKey
);

export const selectScenario = createSelector(selectDispatcherState, fromDispatcher.selectScenario);

export const selectSolution = createSelector(selectDispatcherState, fromDispatcher.selectSolution);

export const selectBatchTime = createSelector(
  selectDispatcherState,
  fromDispatcher.selectBatchTime
);

export const selectTimeOfResponse = createSelector(
  selectDispatcherState,
  fromDispatcher.selectTimeOfResponse
);

export const selectSolutionTime = createSelector(
  selectDispatcherState,
  fromDispatcher.selectSolutionTime
);

export const selectNumberOfRoutes = createSelector(
  selectSolution,
  (solution) => solution?.routes?.length || 0
);

export const selectTotalCost = createSelector(
  selectSolution,
  (solution) => solution?.totalCost || 0
);

export const selectRoutes = createSelector(selectSolution, (solution) => solution?.routes || []);

export const selectScenarioName = createSelector(
  selectDispatcherState,
  fromDispatcher.selectScenarioName
);
