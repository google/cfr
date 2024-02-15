/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { MockMap } from 'src/test/google-maps-mocks';
import { MockInfoWindowService, MockLayerService } from 'src/test/service-mocks';
import * as fromConfig from '../../selectors/config.selectors';
import * as fromMap from '../../selectors/map.selectors';
import * as fromUI from '../../selectors/ui.selectors';
import TravelSimulatorSelectors from '../../selectors/travel-simulator.selectors';
import {
  DepotLayer,
  MapService,
  PostSolveVehicleLayer,
  PostSolveVisitRequestLayer,
  PreSolveVehicleLayer,
  PreSolveVisitRequestLayer,
  RouteLayer,
  VehicleInfoWindowService,
  VisitRequestInfoWindowService,
} from '../../services';
import { MapComponent } from './map.component';

@Component({
  selector: 'app-map-wrapper',
  template: '',
})
class MockMapWrapperComponent {
  @Input() options: google.maps.MapOptions;
  @Output() mapInitialize = new EventEmitter<google.maps.Map>();
}

@Component({
  selector: 'app-hide-map-button',
  template: '',
})
class MockHideMapButtonComponent {
  @Input() disabled = false;
  @Output() hideMap = new EventEmitter<void>();
}

@Component({
  selector: 'app-map-type-button',
  template: '',
})
class MockMapTypeButtonComponent {
  @Input() type = false;
  @Output() typeChange = new EventEmitter<boolean>();
}

@Component({
  selector: 'app-zoom-home-button',
  template: '',
})
class MockZoomHomeButtonComponent {
  @Input() disabled = false;
  @Output() zoomToHome = new EventEmitter<void>();
}

@Component({
  selector: 'app-travel-simulator',
  template: '',
})
class MockTravelSimulatorComponent {}

describe('MapComponent', () => {
  let component: MapComponent;
  let fixture: ComponentFixture<MapComponent>;
  class MockMapService {
    constructor() {
      this.map = new MockMap();
    }
    map: MockMap;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        MockHideMapButtonComponent,
        MockMapTypeButtonComponent,
        MockMapWrapperComponent,
        MockZoomHomeButtonComponent,
        MockTravelSimulatorComponent,
        MapComponent,
      ],
      providers: [
        { provide: DepotLayer, useClass: MockLayerService },
        { provide: PreSolveVisitRequestLayer, useClass: MockLayerService },
        { provide: PostSolveVehicleLayer, useClass: MockLayerService },
        { provide: PreSolveVehicleLayer, useClass: MockLayerService },
        { provide: RouteLayer, useClass: MockLayerService },
        { provide: PreSolveVisitRequestLayer, useClass: MockLayerService },
        { provide: PostSolveVisitRequestLayer, useClass: MockLayerService },
        { provide: MapService, useClass: MockMapService },
        { provide: VehicleInfoWindowService, useClass: MockInfoWindowService },
        { provide: VisitRequestInfoWindowService, useClass: MockInfoWindowService },
        provideMockStore({
          selectors: [
            { selector: fromConfig.selectMapOptions, value: null },
            { selector: fromMap.selectBounds, value: null },
            { selector: fromUI.selectPage, value: null },
            { selector: fromUI.selectHasMap, value: false },
            { selector: fromConfig.selectTimezoneOffset, value: 0 },
            { selector: TravelSimulatorSelectors.selectTravelSimulatorVisible, value: false },
          ],
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
