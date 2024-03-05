/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import { createSelector } from '@ngrx/store';
import { selectVehicleHeadings, selectVehicleLocationsOnRoute } from './map.selectors';
import { vehicleToDeckGL } from './pre-solve-vehicle-layer.selectors';
import RoutesChartSelectors from './routes-chart.selectors';
import * as fromVehicle from './vehicle.selectors';

export const selectFilteredVehicles = createSelector(
  fromVehicle.selectEntities,
  selectVehicleLocationsOnRoute,
  selectVehicleHeadings,
  RoutesChartSelectors.selectFilteredRoutesWithVisitsLookup,
  (vehicles, startLocations, headings, filteredRoutesLookup) => {
    const vehiclesArray = Object.values(vehicles);
    const filteredVehicles = filteredRoutesLookup.size
      ? vehiclesArray.filter((v) => filteredRoutesLookup.has(v.id))
      : [];
    return filteredVehicles.map((vehicle) =>
      vehicleToDeckGL(vehicle, startLocations[vehicle.id], headings[vehicle.id])
    );
  }
);

export const selectFilteredVehiclesSelected = createSelector(
  fromVehicle.selectEntities,
  selectVehicleLocationsOnRoute,
  selectVehicleHeadings,
  RoutesChartSelectors.selectFilteredRoutesSelectedWithVisitsLookup,
  RoutesChartSelectors.selectSelectedRoutesColors,
  (vehicles, startLocations, headings, selectedRoutesLookup, colors) => {
    const selectedVehicles = Object.values(vehicles).filter((v) => selectedRoutesLookup.has(v.id));
    return selectedVehicles.map((vehicle) => ({
      ...vehicleToDeckGL(vehicle, startLocations[vehicle.id], headings[vehicle.id]),
      color: colors[vehicle.id],
    }));
  }
);
