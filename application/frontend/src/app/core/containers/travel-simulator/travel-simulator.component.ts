/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Store, select } from '@ngrx/store';
import Long from 'long';
import { Observable } from 'rxjs';
import ShipmentModelSelectors from '../../selectors/shipment-model.selectors';
import { map } from 'rxjs/operators';
import { MatSliderChange } from '@angular/material/slider';
import { setTime } from '../../actions/travel-simulator.actions';
import TravelSimulatorSelectors from '../../selectors/travel-simulator.selectors';

@Component({
  selector: 'app-travel-simulator',
  templateUrl: './travel-simulator.component.html',
  styleUrls: ['./travel-simulator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TravelSimulatorComponent implements OnInit {
  start$: Observable<number>;
  end$: Observable<number>;
  time$: Observable<number>;

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.start$ = this.store.pipe(
      select(ShipmentModelSelectors.selectGlobalStartTime),
      map((value) => Long.fromValue(value).toNumber())
    );

    this.end$ = this.store.pipe(
      select(ShipmentModelSelectors.selectGlobalEndTime),
      map((value) => Long.fromValue(value).toNumber())
    );

    this.time$ = this.store.pipe(select(TravelSimulatorSelectors.selectTime));
  }

  onTimeChanged(event: MatSliderChange): void {
    this.store.dispatch(setTime({ time: event.value }));
  }
}
