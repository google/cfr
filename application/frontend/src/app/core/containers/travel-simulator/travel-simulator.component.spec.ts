/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TravelSimulatorComponent } from './travel-simulator.component';
import { provideMockStore } from '@ngrx/store/testing';
import ShipmentModelSelectors from '../../selectors/shipment-model.selectors';
import TravelSimulatorSelectors from '../../selectors/travel-simulator.selectors';

describe('TravelSimulatorComponent', () => {
  let component: TravelSimulatorComponent;
  let fixture: ComponentFixture<TravelSimulatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TravelSimulatorComponent],
      providers: [
        provideMockStore({
          selectors: [
            { selector: ShipmentModelSelectors.selectGlobalStartTime, value: 0 },
            { selector: ShipmentModelSelectors.selectGlobalEndTime, value: 0 },
            { selector: TravelSimulatorSelectors.selectTime, value: 0 },
          ],
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TravelSimulatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
