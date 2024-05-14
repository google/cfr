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

export interface Range {
  label: string;
  /** @remarks Must be a multiple of unit step value */
  value: number;
  unitStep: UnitStep;
}

export interface UnitStep {
  label: string;
  /** @remarks Must evenly divide into its associated range value */
  value: number;
}

export interface ChartConfig {
  ranges: Range[];
  defaultRangeIndex: number;
  columnLabelFormatter: ChartColumnLabelFormatter;
}

export type ChartColumnLabelFormatter = (index: number, columnRange: [number, number]) => string;

/**
 * @remarks unit is seconds
 */
export const day: ChartConfig = {
  defaultRangeIndex: 4, // 24 hours
  ranges: [
    {
      label: '1 hour',
      value: 3600,
      unitStep: { label: '5 minutes', value: 3600 / 12 },
    },
    {
      label: '4 hours',
      value: 3600 * 4,
      unitStep: { label: '20 minutes', value: (3600 * 4) / 12 },
    },
    {
      label: '8 hours',
      value: 3600 * 8,
      unitStep: { label: 'hour', value: (3600 * 8) / 8 },
    },
    {
      label: '12 hours',
      value: 3600 * 12,
      unitStep: { label: 'hour', value: (3600 * 12) / 12 },
    },
    {
      label: '24 hours',
      value: 3600 * 24,
      unitStep: { label: '4 hours', value: (3600 * 24) / 6 },
    },
  ],
  columnLabelFormatter: (index, unitRange) => {
    // 24-hour column formatter
    const period = 86400;
    const normalRange = unitRange[0] % period;
    const hour = Math.floor(normalRange / 3600);
    const minute = Math.floor((normalRange % 3600) / 60);
    return hour.toString().padStart(2, '0') + ':' + minute.toString().padStart(2, '0');
  },
};
