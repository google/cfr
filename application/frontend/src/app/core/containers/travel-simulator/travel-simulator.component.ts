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
import { Observable, combineLatest, forkJoin } from 'rxjs';
import ShipmentModelSelectors from '../../selectors/shipment-model.selectors';
import { map } from 'rxjs/operators';
import { MatSliderChange } from '@angular/material/slider';
import { setActive, setTime } from '../../actions/travel-simulator.actions';
import TravelSimulatorSelectors from '../../selectors/travel-simulator.selectors';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { selectTimezoneOffset } from '../../selectors/config.selectors';
import { formatSecondsDate } from 'src/app/util/time-translation';

@Component({
  selector: 'app-travel-simulator',
  templateUrl: './travel-simulator.component.html',
  styleUrls: ['./travel-simulator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TravelSimulatorComponent implements OnInit {
  active$: Observable<boolean>;
  start$: Observable<number>;
  end$: Observable<number>;
  time$: Observable<number>;
  timeDisplayed$: Observable<number>;
  timezoneOffset: number;

  formatSecondsDate = formatSecondsDate;

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.store.select(selectTimezoneOffset).pipe(
      map(value => this.timezoneOffset = value)
    ).subscribe();
  
    this.start$ = this.store.select(ShipmentModelSelectors.selectGlobalStartTime)
      .pipe(map((value) => Long.fromValue(value).toNumber()));

    this.end$ = this.store.select(ShipmentModelSelectors.selectGlobalEndTime)
    .pipe(map((value) => Long.fromValue(value).toNumber()));

    this.timeDisplayed$ = combineLatest([
      this.store.select(TravelSimulatorSelectors.selectTime),
      this.store.select(selectTimezoneOffset)
    ]).pipe(
      map(([value, tzOffset]) => value + tzOffset)
    );

    this.time$ = this.store.select(TravelSimulatorSelectors.selectTime);

    this.active$ = this.store.pipe(select(TravelSimulatorSelectors.selectActive));
  }

  onToggleActive(event: MatSlideToggleChange): void {
    this.store.dispatch(setActive({ active: event.checked }));
  }

  onTimeChanged(event: MatSliderChange): void {
    this.store.dispatch(setTime({ time: event.value }));
  }
}
