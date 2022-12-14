/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import { Column } from 'src/app/core/models';
import { RouteMetadata } from './route-metadata.model';

export type RouteMetadataContext = RouteMetadata;

export interface RouteMetadataColumn<TValue = any> extends Column {
  selector?: (context: RouteMetadataContext) => TValue;
  thenBySelector?: (context: RouteMetadataContext) => TValue;
  valueComparer?: (a: any, b: any) => number;
}

export const routeMetadataColumns: RouteMetadataColumn[] = [
  {
    id: 'select',
    label: 'Select',
    active: true,
    toggleableHidden: true,
    selector: ({ selected }) => selected,
  },
  {
    id: 'id',
    label: 'ID',
    active: true,
    toggleableHidden: true,
    selector: ({ route }) => route.id,
  },
  {
    id: 'vehicle.label',
    label: 'Vehicle Label',
    active: true,
    toggleable: true,
    selector: ({ route }) => route.vehicleLabel,
    valueComparer: (a: string, b: string): number => a.localeCompare(b),
  },
  {
    id: 'vehicleOperator.ids',
    label: 'Vehicle Operator IDs',
    active: true,
    toggleable: true,
    selector: ({ route }) => {
      return route.vehicleOperatorIndices?.length > 0 ? route.vehicleOperatorIndices.join(',') : '';
    },
    valueComparer: (a: string, b: string): number => a.localeCompare(b),
  },
  {
    id: 'vehicleOperator.label',
    label: 'Vehicle Operator Label',
    active: true,
    toggleable: true,
    selector: ({ route }) => {
      return route.vehicleOperatorLabels?.length > 0
        ? '-' + route.vehicleOperatorLabels.join(',')
        : '';
    },
    valueComparer: (a: string, b: string): number => a.localeCompare(b),
  },
  {
    id: 'capacityUtilization',
    label: 'Used / Unused Capacity',
    active: true,
    toggleable: true,
    selector: ({ capacityUtilization }) => capacityUtilization,
  },
  {
    id: 'totalShipments',
    label: 'Number of shipments',
    active: true,
    toggleable: true,
    selector: ({ totalShipments }) => totalShipments,
  },
  {
    id: 'totalPickups',
    label: 'Total number of pickups',
    active: true,
    toggleable: true,
    selector: ({ totalPickups }) => totalPickups,
  },
  {
    id: 'totalDropoffs',
    label: 'Total number of deliveries',
    active: true,
    toggleable: true,
    selector: ({ totalDropoffs }) => totalDropoffs,
  },
  {
    id: 'traveledTime',
    label: 'Traveled time',
    active: true,
    toggleable: true,
    selector: ({ traveledTime }) => traveledTime,
  },
  {
    id: 'cost',
    label: 'Cost per route',
    active: true,
    toggleable: true,
    selector: ({ cost }) => cost,
  },
  {
    id: 'startLocation',
    label: 'Start location',
    active: true,
    toggleable: true,
    selector: ({ startLocation }) => startLocation,
  },
  {
    id: 'endLocation',
    label: 'End Location',
    active: true,
    toggleable: true,
    selector: ({ endLocation }) => endLocation,
  },
];
