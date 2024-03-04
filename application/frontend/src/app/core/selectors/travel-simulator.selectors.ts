/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import * as fromTravelSimulator from '../reducers/travel-simulator.reducer';
import * as fromUI from './ui.selectors';
import { Page, ShipmentRoute, TravelCurve, Visit } from '../models';
import { durationSeconds } from 'src/app/util';
import { Dictionary } from '@ngrx/entity';

export const selectTravelSimulatorState = createFeatureSelector<fromTravelSimulator.State>(
  fromTravelSimulator.travelSimulatorKey
);

const selectTravelSimulatorVisible = createSelector(
  fromUI.selectPage,
  (page) =>
    page === Page.RoutesChart || page === Page.RoutesMetadata || page === Page.ShipmentsMetadata
);

const selectTime = createSelector(selectTravelSimulatorState, fromTravelSimulator.selectTime);

const selectActive = createSelector(selectTravelSimulatorState, fromTravelSimulator.selectActive);

export const routeToTravelCurve = (route: ShipmentRoute, visits: Dictionary<Visit>): TravelCurve => {
  if (!(route && route.travelSteps && route.travelSteps.length)) {
    return [];
  }
  console.assert(route.travelSteps.length === route.visits.length + 1, 'Travel steps length is not equal to one more than visits length');
  
  let accumulatedDistance = 0;
  const travelCurve = route.travelSteps.map((step, index) => {
    // In the case of coincident visits (0,1,2...n) for multiple shipments, returns a visit for each but visits 1...n
    // associate with a step with empty duration and empty distanceMeters.  Set duration and distanceMeters to zero.
    let curveStep = step;
    if (!(step.duration && step.distanceMeters)) {
      curveStep = {
        duration: { seconds: 0 },
        distanceMeters: 0
      };
    }

    let arrivalVisitStartTime: Long;
    // travel steps length is one greater than visits length:
    // example: step 0, visit 0, step 1, visit 1, step 2, visit 2, step 3 end
    if (index < route.visits.length) {
      const arrivalVisit = visits[route.visits[index]];
      arrivalVisitStartTime = durationSeconds(arrivalVisit.startTime);
      // subtract any delay
      if (arrivalVisit.delayBeforeStart && arrivalVisit.delayBeforeStart.duration) {
        arrivalVisitStartTime = arrivalVisitStartTime.subtract(durationSeconds(arrivalVisit.delayBeforeStart.duration));
      }
    } else { // last step
      arrivalVisitStartTime = durationSeconds(route.vehicleEndTime);
    }

    // set the start time for each travel segment to the next visit - duration of travel step
    const startTime = arrivalVisitStartTime.subtract(durationSeconds(curveStep.duration));
    // set the end time for each travel segment to the next visit's start time
    const endTime = arrivalVisitStartTime;
    accumulatedDistance += curveStep.distanceMeters;
    return {
      startTime,
      endTime,
      duration: durationSeconds(curveStep.duration),
      distanceMeters: curveStep.distanceMeters,
      accumulatedDistanceMeters: accumulatedDistance,
      speed: curveStep.distanceMeters / durationSeconds(curveStep.duration).toNumber() // meters/second
    };
  });

  // fill in any gaps in time between travel steps
  travelCurve.push(...fillGaps(travelCurve));
  return travelCurve.sort((a, b) => a.startTime.subtract(b.startTime).toNumber());
}

function fillGaps(travelCurve: TravelCurve): TravelCurve {
  const fillers = [];
  travelCurve.forEach((segment, index) => {
    const lastSegment = travelCurve.length - 1 <= index;
    if (lastSegment) {
      return fillers;
    }
    const expectedSegmentEndTime = travelCurve[index + 1].startTime;
    if (segment.endTime.notEquals(expectedSegmentEndTime)) {
      const filler = {
        startTime: segment.endTime,
        endTime: expectedSegmentEndTime,
        duration: expectedSegmentEndTime.subtract(segment.endTime),
        distanceMeters: 0.0,
        accumulatedDistanceMeters: segment.accumulatedDistanceMeters,
        speed: 0.0
      };
      console.assert(filler.duration.greaterThan(0), 'Travel curve segment has invalid zero or negative duration');
      fillers.push(filler);
    }
  });
  return fillers;
}

export const TravelSimulatorSelectors = {
  selectActive,
  selectTravelSimulatorVisible,
  selectTime,
};

export default TravelSimulatorSelectors;
