/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { select, Store } from '@ngrx/store';
import { combineLatest, Observable } from 'rxjs';
import { map, switchMap, withLatestFrom } from 'rxjs/operators';
import * as fromConfig from 'src/app/core/selectors/config.selectors';
import * as fromDispatcher from 'src/app/core/selectors/dispatcher.selectors';
import * as fromPostSolveShipment from 'src/app/core/selectors/post-solve-shipment.selectors';
import PreSolveShipmentSelectors from 'src/app/core/selectors/pre-solve-shipment.selectors';
import ShipmentRouteSelectors, * as fromShipmentRoute from 'src/app/core/selectors/shipment-route.selectors';
import * as fromSolution from 'src/app/core/selectors/solution.selectors';
import * as fromTimeline from 'src/app/core/selectors/timeline.selectors';
import { PostSolveMetricsActions } from '../../actions';
import { Page, Timeline, TimelineCategory, TimeSet } from '../../models';

@Component({
  selector: 'app-post-solve-metrics',
  templateUrl: './post-solve-metrics.component.html',
  styleUrls: ['./post-solve-metrics.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostSolveMetricsComponent implements OnInit {
  duration$: Observable<[Long, Long]>;
  numberOfRoutes$: Observable<number>;
  totalDistance$: Observable<number>;
  skippedShipmentsCount$: Observable<number>;
  shipmentsCount$: Observable<number>;
  solutionTime$: Observable<number>;
  totalCost$: Observable<number>;
  timezoneOffset$: Observable<number>;
  timeline$: Observable<Timeline>;
  vehicleTimeAverages$: Observable<TimeSet>;

  constructor(private router: Router, private store: Store) {}

  ngOnInit(): void {
    this.duration$ = this.store.pipe(select(ShipmentRouteSelectors.selectRoutesDuration));
    this.numberOfRoutes$ = this.store.pipe(select(fromSolution.selectUsedRoutesCount));
    this.totalDistance$ = this.store.pipe(select(fromSolution.selectTotalRoutesDistanceMeters));
    this.solutionTime$ = this.store.pipe(select(fromDispatcher.selectSolutionTime));
    this.skippedShipmentsCount$ = this.store.pipe(
      select(fromPostSolveShipment.selectTotalSkippedShipments)
    );
    this.shipmentsCount$ = this.store.pipe(select(PreSolveShipmentSelectors.selectTotalRequested));
    this.totalCost$ = this.store.pipe(select(fromSolution.selectTotalCost));
    this.timezoneOffset$ = this.store.pipe(select(fromConfig.selectTimezoneOffset));

    this.vehicleTimeAverages$ = this.store.pipe(
      select(fromShipmentRoute.selectAll),
      withLatestFrom(this.store.pipe(select(fromTimeline.selectTimelineSelectors))),
      switchMap(([routes, timelineSelectors]) => {
        const timelines = routes.map((route) => timelineSelectors[route.id]);
        return combineLatest(timelines.map((tl) => this.store.pipe(select(tl))));
      }),
      map((res) => {
        return this.calculateVehicleTimeAverages(res);
      })
    );
  }

  calculateVehicleTimeAverages(timelines: Timeline[]): TimeSet {
    const totalTimes = {
      breakTime: 0,
      idleTime: 0,
      serviceTime: 0,
      travelTime: 0,
    };
    timelines.forEach((timeline) => {
      if (!timeline) {
        return;
      }
      const totals = this.summarizeTimeline(timeline);
      totalTimes.breakTime += totals.breakTime;
      totalTimes.idleTime += totals.idleTime;
      totalTimes.serviceTime += totals.serviceTime;
      totalTimes.travelTime += totals.travelTime;
    });

    const sum =
      totalTimes.breakTime + totalTimes.idleTime + totalTimes.serviceTime + totalTimes.travelTime;
    const percentTimes = {
      breakTime: totalTimes.breakTime / sum,
      idleTime: totalTimes.idleTime / sum,
      serviceTime: totalTimes.serviceTime / sum,
      travelTime: totalTimes.travelTime / sum,
    };
    return percentTimes;
  }

  summarizeTimeline(timeline: Timeline): TimeSet {
    const totalTimes = {
      breakTime: 0,
      idleTime: 0,
      serviceTime: 0,
      travelTime: 0,
    };

    const minTime = timeline.reduce(
      (min, segment) => Math.min(min, segment.startTime.toNumber()),
      Infinity
    );
    const maxTime = timeline.reduce(
      (max, segment) => Math.max(max, segment.endTime.toNumber()),
      -Infinity
    );

    timeline.forEach((segment) => {
      const segmentDuration = segment.endTime.subtract(segment.startTime).toNumber();
      switch (segment.category) {
        case TimelineCategory.BreakTime:
          totalTimes.breakTime += segmentDuration;
          break;
        case TimelineCategory.Driving:
          totalTimes.travelTime += segmentDuration;
          break;
        case TimelineCategory.Service:
          totalTimes.serviceTime += segmentDuration;
          break;
      }
    });
    totalTimes.idleTime = Math.max(
      0,
      maxTime - minTime - totalTimes.breakTime - totalTimes.serviceTime - totalTimes.travelTime
    );
    return totalTimes;
  }

  onSkippedShipmentsClick(): void {
    this.store.dispatch(PostSolveMetricsActions.showSkippedShipments());
    this.router.navigateByUrl('/' + Page.ShipmentsMetadata, { skipLocationChange: true });
  }
}
