import { createFeatureSelector, createSelector } from '@ngrx/store';
import * as fromTravelSimulator from '../reducers/travel-simulator.reducer';
import * as fromUI from './ui.selectors';
import { Page } from '../models';

export const selectTravelSimulatorState = createFeatureSelector<fromTravelSimulator.State>(
  fromTravelSimulator.travelSimulatorKey
);

const selectTravelSimulatorVisible = createSelector(
  fromUI.selectPage,
  (page) =>
    page === Page.RoutesChart || page === Page.RoutesMetadata || page === Page.ShipmentsMetadata
);

export const TravelSimulatorSelectors = {
  selectTravelSimulatorVisible,
};

export default TravelSimulatorSelectors;
