/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import { createAction, props } from '@ngrx/store';
import {
  ElapsedSolution,
  ISkippedShipmentReason,
  Scenario,
  Shipment,
  ShipmentRoute,
  Vehicle,
  VehicleOperator,
  Visit,
  VisitRequest,
} from '../models';

export const uploadScenarioSuccess = createAction(
  '[Dispatcher] Upload Scenario Success',
  props<{ scenario: Scenario; scenarioName?: string }>()
);

export const loadScenario = createAction(
  '[Dispatcher] Load Scenario',
  props<{
    shipments: Shipment[];
    vehicles: Vehicle[];
    vehicleOperators: VehicleOperator[];
    visitRequests: VisitRequest[];
    selectedShipments: number[];
    selectedVehicles: number[];
    selectedVehicleOperators: number[];
    changeTime: number;
  }>()
);

export const loadSolution = createAction(
  '[Dispatcher] Load Solution',
  props<{
    elapsedSolution: ElapsedSolution;
    requestedShipmentIds: number[];
    requestedVehicleIds: number[];
    shipmentRoutes: ShipmentRoute[];
    visits: Visit[];
    skippedShipments: number[];
    skippedShipmentReasons: { [id: number]: ISkippedShipmentReason[] };
  }>()
);

export const initializeRangeOffset = createAction(
  '[Dispatcher] Initialize Range Offset',
  props<{ rangeOffset: number }>()
);

export const clearSolution = createAction('[Dispatcher] Clear Solution');

export const saveScenarioName = createAction(
  '[Dispatcher] Save Scenario Name',
  props<{ scenarioName: string }>()
);
