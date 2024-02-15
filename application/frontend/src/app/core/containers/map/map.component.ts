/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { select, Store } from '@ngrx/store';
import { combineLatest, Observable, Subscription } from 'rxjs';
import { distinctUntilChanged, take } from 'rxjs/operators';
import { selectMapSelectionToolsVisible, State } from 'src/app/reducers';
import { ActiveFilter, FilterOption } from 'src/app/shared/models';
import { boundsToTurfPolygon, mapsPolygonToTurfPolygon } from 'src/app/util';
import {
  MapActions,
  PreSolveShipmentActions,
  PreSolveVehicleActions,
  RoutesChartActions,
} from '../../actions';
import { SelectionMode } from '../../models';
import { Page } from '../../models/page';
import * as fromRoutesFilter from '../../models/route-filter';
import * as fromShipmentFilter from '../../models/shipment-filter';
import * as fromVehicleFilter from '../../models/vehicle-filter';
import * as fromConfig from '../../selectors/config.selectors';
import * as fromMap from '../../selectors/map.selectors';
import { selectSelectionFilterActive } from '../../selectors/map.selectors';
import * as fromPostSolve from '../../selectors/post-solve.selectors';
import * as fromPreSolve from '../../selectors/pre-solve.selectors';
import * as fromUI from '../../selectors/ui.selectors';
import { selectPage } from '../../selectors/ui.selectors';
import TravelSimulatorSelectors from '../../selectors/travel-simulator.selectors';
import {
  MATERIAL_COLORS,
  VehicleInfoWindowService,
  VisitRequestInfoWindowService,
} from '../../services';
import { DepotLayer } from '../../services/depot-layer.service';
import { MapService } from '../../services/map.service';
import { PostSolveVehicleLayer } from '../../services/post-solve-vehicle-layer.service';
import { PostSolveVisitRequestLayer } from '../../services/post-solve-visit-request-layer.service';
import { PreSolveVehicleLayer } from '../../services/pre-solve-vehicle-layer.service';
import { PreSolveVisitRequestLayer } from '../../services/pre-solve-visit-request-layer.service';
import { RouteLayer } from '../../services/route-layer.service';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapComponent implements OnInit, OnDestroy {
  options$: Observable<google.maps.MapOptions>;
  mapSelectionToolsVisible$: Observable<boolean>;
  selectionFilterActive$: Observable<boolean>;
  timezoneOffset$: Observable<number>;
  travelSimulatorVisible$: Observable<boolean>;

  get bounds(): google.maps.LatLngBounds {
    return this.mapService.bounds;
  }

  private readonly subscriptions: Subscription[] = [];
  private drawingManager: google.maps.drawing.DrawingManager;
  private map: google.maps.Map;
  private page: Page;

  constructor(
    private changeDetector: ChangeDetectorRef,
    private store: Store<State>,
    private mapService: MapService,
    private depotLayer: DepotLayer,
    private routeLayer: RouteLayer,
    private postSolveVehicleLayer: PostSolveVehicleLayer,
    private postSolveVisitRequestLayer: PostSolveVisitRequestLayer,
    private preSolveVehicleLayer: PreSolveVehicleLayer,
    private preSolveVisitRequestLayer: PreSolveVisitRequestLayer,
    public vehicleInfoWindowService: VehicleInfoWindowService,
    public visitRequestInfoWindowService: VisitRequestInfoWindowService
  ) {}

  ngOnInit(): void {
    this.options$ = this.store.pipe(select(fromConfig.selectMapOptions), take(1));
    this.mapSelectionToolsVisible$ = this.store.pipe(select(selectMapSelectionToolsVisible));
    this.selectionFilterActive$ = this.store.pipe(select(selectSelectionFilterActive));
    this.travelSimulatorVisible$ = this.store.pipe(
      select(TravelSimulatorSelectors.selectTravelSimulatorVisible)
    );

    this.subscriptions.push(
      this.store
        .pipe(
          select(fromMap.selectBounds),
          distinctUntilChanged((a, b) => a === b || a?.equals(b))
        )
        .subscribe((bounds) => {
          if (bounds) {
            this.mapService.setBounds(bounds);
            this.changeDetector.markForCheck();
          }
        }),

      combineLatest([
        this.store.pipe(select(fromPreSolve.selectActive)),
        this.store.pipe(select(fromPostSolve.selectActive)),
        this.store.pipe(select(fromUI.selectHasMap)),
      ]).subscribe(([preSolve, postSolve, hasMap]) => {
        this.routeLayer.visible = hasMap && postSolve;
        this.preSolveVehicleLayer.visible = hasMap && preSolve;
        this.preSolveVisitRequestLayer.visible = hasMap && preSolve;
        this.postSolveVehicleLayer.visible = hasMap && postSolve;
        this.postSolveVisitRequestLayer.visible = hasMap && postSolve;
        this.depotLayer.visible = hasMap;
      }),

      this.store.pipe(select(selectPage)).subscribe((page) => (this.page = page))
    );

    this.timezoneOffset$ = this.store.pipe(select(fromConfig.selectTimezoneOffset));
  }

  ngOnDestroy(): void {
    this.subscriptions.splice(0).forEach((subscription) => subscription.unsubscribe());
  }

  private createFilter(option: FilterOption): ActiveFilter {
    return {
      id: option.id,
      label: option.label,
    };
  }

  onToggleSelectionFilter(active: boolean): void {
    if (this.page === Page.Shipments) {
      const filter = this.createFilter(fromShipmentFilter.selectedShipmentFilterOption);
      if (active) {
        this.store.dispatch(PreSolveShipmentActions.addFilter({ filter }));
      } else {
        this.store.dispatch(PreSolveShipmentActions.removeFilter({ filter }));
      }
    } else if (this.page === Page.Vehicles) {
      const filter = this.createFilter(fromVehicleFilter.selectedVehicleFilterOption);
      if (active) {
        this.store.dispatch(PreSolveVehicleActions.addFilter({ filter }));
      } else {
        this.store.dispatch(PreSolveVehicleActions.removeFilter({ filter }));
      }
    } else if (this.page === Page.RoutesChart) {
      const filter = this.createFilter(fromRoutesFilter.selectedRouteFilterOption);
      if (active) {
        this.store.dispatch(RoutesChartActions.addFilter({ filter }));
      } else {
        this.store.dispatch(RoutesChartActions.removeFilter({ filter }));
      }
    }
  }

  onToggleSelectMapItems(mode: SelectionMode): void {
    if (mode === SelectionMode.Off) {
      this.drawingManager.setMap(null);
    } else {
      this.drawingManager.setMap(this.map);
      this.drawingManager.setDrawingMode(
        mode === SelectionMode.Bbox
          ? google.maps.drawing.OverlayType.RECTANGLE
          : google.maps.drawing.OverlayType.POLYGON
      );
    }
  }

  onTypeChange(satellite: boolean): void {
    this.map.setMapTypeId(satellite ? 'satellite' : 'roadmap');
  }

  onHideMap(): void {
    this.store.dispatch(MapActions.hideMap());
  }

  onZoomToHome(): void {
    this.mapService.zoomToHome();
  }

  onMapInitialize(map: google.maps.Map): void {
    this.map = map;
    this.drawingManager = this.createDrawingTools();
  }

  createDrawingTools(): google.maps.drawing.DrawingManager {
    const drawingManager = new google.maps.drawing.DrawingManager({
      drawingControl: false,
      drawingMode: google.maps.drawing.OverlayType.RECTANGLE,
      rectangleOptions: {
        fillOpacity: 0.0,
        strokeColor: MATERIAL_COLORS.Red.hex,
      },
      polygonOptions: {
        fillOpacity: 0.0,
        strokeColor: MATERIAL_COLORS.Red.hex,
      },
    });

    google.maps.event.addListener(drawingManager, 'overlaycomplete', (event) => {
      let polygon;
      if (event.type === 'rectangle') {
        const bounds = event.overlay.getBounds();
        polygon = boundsToTurfPolygon(bounds);
      } else {
        polygon = mapsPolygonToTurfPolygon(event.overlay);
      }
      event.overlay.setMap(null);

      if (this.page === Page.Shipments) {
        this.store.dispatch(MapActions.selectPreSolveShipmentMapItems({ polygon }));
      } else if (this.page === Page.Vehicles) {
        this.store.dispatch(MapActions.selectPreSolveVehicleMapItems({ polygon }));
      } else if (this.page === Page.RoutesChart) {
        this.store.dispatch(MapActions.selectPostSolveMapItems({ polygon }));
      }
    });
    return drawingManager;
  }
}
