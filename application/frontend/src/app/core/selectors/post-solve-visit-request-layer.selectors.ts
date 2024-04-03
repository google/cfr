/*
Copyright 2024 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { createSelector } from '@ngrx/store';
import { VisitRequest } from '../models';
import RoutesChartSelectors from './routes-chart.selectors';
import * as fromVisitRequest from './visit-request.selectors';
import * as fromVisit from './visit.selectors';
import PreSolveShipmentSelectors from './pre-solve-shipment.selectors';
import { fromDispatcherToTurfPoint } from 'src/app/util';
import { Feature, Point } from '@turf/helpers';
import { selectMouseOverId } from './ui.selectors';

export const selectVisitRequests = createSelector(
  fromVisitRequest.selectAll,
  PreSolveShipmentSelectors.selectRequestedLookup,
  (visitRequests, requested) =>
    visitRequests.filter((visitRequest) => requested.has(visitRequest.shipmentId))
);

export const selectFilteredRouteVisitRequests = createSelector(
  RoutesChartSelectors.selectFilteredRoutesVisitRequestIds,
  selectVisitRequests,
  (filteredVisitRequestIds, visitRequests) => {
    if (!filteredVisitRequestIds) {
      return visitRequests;
    }
    return visitRequests.filter((v) => filteredVisitRequestIds.has(v.id));
  }
);

export const selectFilteredRouteVisitRequestsSelected = createSelector(
  RoutesChartSelectors.selectSelectedRoutesVisitIds,
  selectFilteredRouteVisitRequests,
  (selectedRouteVisitIds, visitRequests) => {
    return visitRequests.filter((v) => selectedRouteVisitIds.includes(v.id));
  }
);

export const selectSelectedRouteVisitRequests = createSelector(
  RoutesChartSelectors.selectSelectedRoutesVisitIds,
  selectVisitRequests,
  (selectedRouteVisitIds, visitRequests) => {
    return visitRequests.filter((v) => selectedRouteVisitIds.includes(v.id));
  }
);

const visitRequestToDeckGL = (visitRequest: VisitRequest, made: boolean) => {
  return {
    ...visitRequest,
    arrivalPosition: [
      visitRequest.arrivalWaypoint?.location?.latLng?.longitude,
      visitRequest.arrivalWaypoint?.location?.latLng?.latitude,
    ],
    departurePosition: visitRequest.departureWaypoint?.location?.latLng
      ? [
          visitRequest.departureWaypoint.location.latLng.longitude,
          visitRequest.departureWaypoint.location.latLng.latitude,
        ]
      : undefined,
    made,
  };
};

export const selectFilteredVisitRequests = createSelector(
  selectFilteredRouteVisitRequests,
  fromVisit.selectEntities,
  (visitRequests, visits) => {
    return visitRequests.map((visitRequest) => {
      const made = !!visits[visitRequest.id];
      return visitRequestToDeckGL(visitRequest, made);
    });
  }
);

export const selectFilteredVisitRequestsSelected = createSelector(
  selectFilteredRouteVisitRequestsSelected,
  fromVisit.selectEntities,
  RoutesChartSelectors.selectSelectedRoutesColors,
  (visitRequests, visits, colors) => {
    return visitRequests.map((visitRequest) => {
      const made = !!visits[visitRequest.id];
      return {
        ...visitRequestToDeckGL(visitRequest, made),
        color: made ? colors[visits[visitRequest.id].shipmentRouteId] : null,
      };
    });
  }
);

export const selectSelectedVisitRequests = createSelector(
  selectSelectedRouteVisitRequests,
  fromVisit.selectEntities,
  RoutesChartSelectors.selectSelectedRoutesColors,
  (visitRequests, visits, colors) => {
    return visitRequests.map((visitRequest) => {
      const made = !!visits[visitRequest.id];
      return {
        ...visitRequestToDeckGL(visitRequest, made),
        color: made ? colors[visits[visitRequest.id].shipmentRouteId] : null,
      };
    });
  }
);

export const selectFilteredVisitRequestsTurfPoints = createSelector(
  selectFilteredRouteVisitRequests,
  fromVisit.selectEntities,
  (visitRequests, visits) => {
    const turfPoints: { [routeId: number]: Feature<Point> } = {};
    visitRequests.forEach((visitRequest) => {
      const feature = fromDispatcherToTurfPoint(visitRequest.arrivalWaypoint?.location?.latLng);
      feature.properties.shipmentRouteId = visits[visitRequest.id]
        ? visits[visitRequest.id].shipmentRouteId
        : undefined;
      feature.properties.made = !!visits[visitRequest.id];
      turfPoints[visitRequest.id] = feature;
    });
    return turfPoints;
  }
);

export const selectMouseOverVisitRequest = createSelector(
  selectFilteredRouteVisitRequests,
  RoutesChartSelectors.selectSelectedRoutesVisitIds,
  fromVisit.selectEntities,
  RoutesChartSelectors.selectSelectedRoutesColors,
  selectMouseOverId,
  (filtered, selected, visits, colors, mouseOverId) => {
    return filtered
      .filter((visitRequest) => visitRequest.id === mouseOverId)
      .map((visitRequest) => {
        const made = !!visits[visitRequest.id];
        return {
          ...visitRequestToDeckGL(visitRequest, made),
          color: made ? colors[visits[visitRequest.id].shipmentRouteId] : null,
          selected: made ? selected[visits[visitRequest.id].shipmentRouteId] : null,
        };
      });
  }
);
