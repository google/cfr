/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import { createSelector } from '@ngrx/store';
import buffer from '@turf/buffer';
import lineIntersect from '@turf/line-intersect';
import {
  bufferBounds,
  durationSeconds,
  findNearestCandidatePointToTargetAlongPath,
  findPathHeadingAtPointOptimized,
  fromDispatcherLatLng,
  fromTurfPoint,
  getPointAlongPathByDistance,
  pointsAreCoincident,
  toTurfLineString,
  toTurfPoint,
} from 'src/app/util';
import { ILatLng, Page, ShipmentRoute, Visit, VisitRequest } from '../models';
import * as fromDepot from './depot.selectors';
import PreSolveShipmentSelectors from './pre-solve-shipment.selectors';
import PreSolveVehicleSelectors from './pre-solve-vehicle.selectors';
import RoutesChartSelectors from './routes-chart.selectors';
import ShipmentRouteSelectors from './shipment-route.selectors';
import { selectPage } from './ui.selectors';
import * as fromVehicle from './vehicle.selectors';
import VisitSelectors from './visit.selectors';
import VisitRequestSelectors from './visit-request.selectors';
import TravelSimulatorSelectors from './travel-simulator.selectors';
import * as fromShipmentRoute from './shipment-route.selectors';
import * as fromVisits from './visit.selectors';
import Long from 'long';
import { Dictionary } from '@ngrx/entity';

type MapLatLng = google.maps.LatLng;

const findAlternativeStartLocation = (path: MapLatLng[]): MapLatLng => {
  const distanceAlongPath = google.maps.geometry.spherical.computeLength(path) / 10;
  return getPointAlongPathByDistance(path, distanceAlongPath);
};

export const getVehicleStartingLocation = (
  path: MapLatLng[],
  bufferDistance: number,
  occupiedStartLocations: MapLatLng[]
): MapLatLng => {
  const startingPoint = toTurfPoint(path[0]);
  const buffered = buffer(startingPoint, bufferDistance, { units: 'meters' });
  const route = toTurfLineString(path);
  const intersectingPoints = lineIntersect(route, buffered);

  let vehicleStartLocation: MapLatLng;
  if (intersectingPoints.features.length === 1) {
    vehicleStartLocation = fromTurfPoint(intersectingPoints.features[0].geometry);
  } else if (intersectingPoints.features.length === 0) {
    // eslint-disable-next-line no-console
    console.log(
      'Vehicle starting position not found using buffer.  Using distance along path instead.'
    );
    vehicleStartLocation = findAlternativeStartLocation(path);
  } else if (intersectingPoints.features.length > 1) {
    vehicleStartLocation = findNearestCandidatePointToTargetAlongPath(
      intersectingPoints,
      startingPoint.geometry,
      route.geometry
    );
  }

  occupiedStartLocations.forEach((location) => {
    if (location && pointsAreCoincident(location, vehicleStartLocation, bufferDistance / 100)) {
      // eslint-disable-next-line no-console
      console.log('Found coincident vehicle start locations.  Moving one of them.');
      vehicleStartLocation = findAlternativeStartLocation(path);
    }
  });
  return vehicleStartLocation;
};

export const selectScenarioBounds = createSelector(
  fromDepot.selectBounds,
  fromVehicle.selectAllBounds,
  VisitRequestSelectors.selectAllBounds,
  (depotBounds, vehiclesBounds, visitRequestsBounds) => {
    const bounds = new google.maps.LatLngBounds();
    bounds.union(depotBounds.union(vehiclesBounds).union(visitRequestsBounds));
    return bounds;
  }
);

export const selectScenarioBoundsRadius = createSelector(selectScenarioBounds, (bounds) => {
  const neRadius = google.maps.geometry.spherical.computeDistanceBetween(
    bounds.getCenter(),
    bounds.getNorthEast()
  );
  const swRadius = google.maps.geometry.spherical.computeDistanceBetween(
    bounds.getCenter(),
    bounds.getSouthWest()
  );
  return (neRadius + swRadius) / 2;
});

const getVisitRequestsBounds = (visitRequests: VisitRequest[]) => {
  const bounds = new google.maps.LatLngBounds();
  visitRequests.forEach((visitRequest) => {
    if (visitRequest.arrivalWaypoint?.location?.latLng) {
      bounds.extend(fromDispatcherLatLng(visitRequest.arrivalWaypoint.location.latLng));
    }
    if (visitRequest.departureWaypoint?.location?.latLng) {
      bounds.extend(fromDispatcherLatLng(visitRequest.departureWaypoint.location.latLng));
    }
  });
  return bounds;
};

export const selectSolutionBounds = createSelector(
  fromDepot.selectDepot,
  VisitSelectors.selectVisitRequests,
  ShipmentRouteSelectors.selectAllBounds,
  (depot: ILatLng, visitRequests: VisitRequest[], shipmentRouteBounds) => {
    const bounds = getVisitRequestsBounds(visitRequests);
    bounds.union(shipmentRouteBounds);
    if (!bounds.isEmpty() && depot) {
      bounds.extend(fromDispatcherLatLng(depot));
    }
    return bounds;
  }
);

export const selectBounds = createSelector(
  selectScenarioBounds,
  selectSolutionBounds,
  (scenarioBounds, solutionBounds): google.maps.LatLngBounds => {
    if (solutionBounds && !solutionBounds.isEmpty()) {
      return solutionBounds;
    }
    if (scenarioBounds && !scenarioBounds.isEmpty()) {
      return scenarioBounds;
    }
  }
);

const getVehicleStartLocationsOnRoute = (
  paths: { [id: number]: MapLatLng[] },
  boundsRadius: number
): { [id: number]: MapLatLng } => {
  const occupiedStartLocations: MapLatLng[] = [];
  const lookup: { [id: number]: MapLatLng } = {};
  Object.entries(paths).forEach(([key, vehiclePath]) => {
    const startLocation = vehiclePath?.length
      ? getVehicleStartingLocation(vehiclePath, boundsRadius / 4, occupiedStartLocations)
      : null;
    occupiedStartLocations.push(startLocation);
    lookup[+key] = startLocation;
  });
  return lookup;
};

const getSimulatedVehicleLocationsOnRoute = (
  routes: ShipmentRoute[],
  visits: Dictionary<Visit>,
  pathFn: (routeId: number) => google.maps.LatLng[],
  simulationTime: number
): { [id: number]: MapLatLng } => {
  const lookup: { [id: number]: MapLatLng } = {};
  routes.forEach((route) => {
    const path = pathFn(route.id);
    let interpolationDistance = 0;
    let totalDistance = 0;

    if (durationSeconds(route.vehicleStartTime).greaterThan(simulationTime)) {
      lookup[route.id] = path[0];
    } else if (durationSeconds(route.vehicleEndTime).lessThan(simulationTime)) {
      lookup[route.id] = path[path.length - 1];
    } else {
      route.transitions.forEach((transition) => {
        const start = durationSeconds(transition.startTime, Long.ZERO);
        const duration = durationSeconds(transition.travelDuration, Long.ZERO);
        const end = start.add(duration);

        if (start.lessThanOrEqual(simulationTime)) {
          const transitionPercent = Math.min(
            1,
            Math.max(0, (simulationTime - start.toNumber()) / end.subtract(start).toNumber())
          );
          interpolationDistance =
            totalDistance + transition.travelDistanceMeters * transitionPercent;
        }
        totalDistance += transition.travelDistanceMeters;
      });
      lookup[route.id] = getPointAlongPathByDistance(path, interpolationDistance);
    }
  });
  return lookup;
};

export const selectVehicleStartLocationsOnRoute = createSelector(
  ShipmentRouteSelectors.selectOverviewPolylinePaths,
  selectScenarioBoundsRadius,
  (paths, boundsRadius) => getVehicleStartLocationsOnRoute(paths, boundsRadius)
);

export const selectSimulatedVehicleLocationsOnRoute = createSelector(
  fromShipmentRoute.selectAll,
  fromVisits.selectEntities,
  ShipmentRouteSelectors.selectOverviewPolylinePathFn,
  TravelSimulatorSelectors.selectTime,
  (routes, visits, pathFn, simulationTime) =>
    getSimulatedVehicleLocationsOnRoute(routes, visits, pathFn, simulationTime)
);

export const selectVehicleLocationsOnRoute = createSelector(
  TravelSimulatorSelectors.selectActive,
  selectSimulatedVehicleLocationsOnRoute,
  selectVehicleStartLocationsOnRoute,
  (useSimulatedLocations, simulatedLocations, locations) =>
    useSimulatedLocations ? simulatedLocations : locations
);

export const selectVehicleHeadings = createSelector(
  selectVehicleLocationsOnRoute,
  ShipmentRouteSelectors.selectOverviewPolylinePaths,
  (vehicleLocations, paths) => {
    const vehicleHeadings: { [id: number]: number } = {};
    Object.entries(paths).forEach(([key, path]) => {
      const id = +key;
      vehicleHeadings[id] = path
        ? findPathHeadingAtPointOptimized(path, vehicleLocations[id])
        : null;
    });
    return vehicleHeadings;
  }
);

export const selectVehicleInitialHeadings = createSelector(
  fromVehicle.selectEntities,
  (vehicles) => {
    const lookup: { [id: number]: number } = {};
    Object.keys(vehicles).forEach((key) => {
      lookup[+key] = Math.random() * 360 - 180;
    });
    return lookup;
  }
);

export const selectFormScenarioBounds = createSelector(selectScenarioBounds, (scenarioBounds) => {
  if (!scenarioBounds.isEmpty()) {
    return bufferBounds(scenarioBounds, 50);
  }
  return scenarioBounds;
});

export const selectPreSolveEditShipmentFormBounds = createSelector(
  selectFormScenarioBounds,
  PreSolveShipmentSelectors.selectEditShipmentVisitRequests,
  (formScenarioBounds, editShipmentVisitRequests) => {
    const visitRequestBounds = getVisitRequestsBounds(editShipmentVisitRequests);
    if (!visitRequestBounds.isEmpty()) {
      return bufferBounds(visitRequestBounds, 50);
    }
    return formScenarioBounds;
  }
);

export const selectInfoWindowVehicle = createSelector(
  fromVehicle.selectClickedVehicle,
  selectVehicleLocationsOnRoute,
  (vehicle, startLocations) => {
    return (
      vehicle && {
        id: vehicle.id,
        position: startLocations[vehicle.id]
          ? startLocations[vehicle.id]
          : fromDispatcherLatLng(vehicle.startWaypoint?.location?.latLng),
      }
    );
  }
);

export const selectInfoWindowVisitRequest = createSelector(
  VisitRequestSelectors.selectClickedVisitRequest,
  (visitRequest) => {
    return (
      visitRequest && {
        id: visitRequest.id,
        position: fromDispatcherLatLng(visitRequest.arrivalWaypoint?.location?.latLng),
      }
    );
  }
);

export const selectSelectionFilterActive = createSelector(
  selectPage,
  PreSolveShipmentSelectors.selectSelectionFilterActive,
  PreSolveVehicleSelectors.selectSelectionFilterActive,
  RoutesChartSelectors.selectSelectionFilterActive,
  (page, shipmentsActive, vehiclesActive, routesActive) => {
    if (page === Page.Shipments) {
      return shipmentsActive;
    } else if (page === Page.Vehicles) {
      return vehiclesActive;
    } else if (page === Page.RoutesChart) {
      return routesActive;
    }
  }
);
