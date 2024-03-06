/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Store, select } from '@ngrx/store';
import Long from 'long';
import { Observable, Subject, Subscription, asyncScheduler, combineLatest, interval } from 'rxjs';
import ShipmentModelSelectors from '../../selectors/shipment-model.selectors';
import { map, throttleTime } from 'rxjs/operators';
import { MatSlider, MatSliderChange } from '@angular/material/slider';
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
export class TravelSimulatorComponent implements OnInit, OnDestroy {
  @ViewChild(MatSlider) timeSlider: MatSlider;

  active$: Observable<boolean>;
  start$: Observable<number>;
  end$: Observable<number>;
  time$: Observable<number>;
  timeDisplayed$: Observable<number>;
  timezoneOffset: number;
  valueChanged = new Subject<number>();
  animationTimer$: Subscription;
  animationSpeedMultiple = 3;

  formatSecondsDate = formatSecondsDate;

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.store
      .select(selectTimezoneOffset)
      .pipe(map((value) => (this.timezoneOffset = value)))
      .subscribe();

    this.start$ = this.store
      .select(ShipmentModelSelectors.selectGlobalStartTime)
      .pipe(map((value) => Long.fromValue(value).toNumber()));

    this.end$ = this.store
      .select(ShipmentModelSelectors.selectGlobalEndTime)
      .pipe(map((value) => Long.fromValue(value).toNumber()));

    this.timeDisplayed$ = combineLatest([
      this.store.select(TravelSimulatorSelectors.selectTime),
      this.store.select(selectTimezoneOffset),
    ]).pipe(map(([value, tzOffset]) => value + tzOffset));

    this.time$ = this.store.select(TravelSimulatorSelectors.selectTime);

    this.active$ = this.store.pipe(select(TravelSimulatorSelectors.selectActive));

    this.valueChanged
      .pipe(
        throttleTime(100, asyncScheduler, { leading: true, trailing: true }),
        map((time) => this.store.dispatch(setTime({ time })))
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.onEndAnimate();
  }

  onBeginAnimate(): void {
    this.timeSlider.disabled = true;
    this.animationTimer$ = interval(100).subscribe((_value) => {
      const newTime = this.timeSlider.value + 60 * this.animationSpeedMultiple;
      if (newTime > this.timeSlider.max) {
        this.onEndAnimate();
        return;
      }
      this.valueChanged.next(newTime);
    });
  }

  onEndAnimate(): void {
    this.animationTimer$?.unsubscribe();
    this.timeSlider.disabled = false;
  }

  onToggleActive(event: MatSlideToggleChange): void {
    this.store.dispatch(setActive({ active: event.checked }));

    if (!event.checked) {
      this.onEndAnimate();
    }
  }

  onTimeChanged(event: MatSliderChange): void {
    this.valueChanged.next(event.value);
  }
}
