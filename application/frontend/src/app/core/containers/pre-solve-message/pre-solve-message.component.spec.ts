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

import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import PreSolveShipmentSelectors from '../../selectors/pre-solve-shipment.selectors';
import PreSolveVehicleSelectors from '../../selectors/pre-solve-vehicle.selectors';
import { PreSolveMessageComponent } from './pre-solve-message.component';

@Component({
  selector: 'app-base-pre-solve-message',
  template: '',
})
class MockBasePreSolveMessageComponent {
  @Input() numberOfVehicles = 0;
  @Input() numberOfShipments = 0;
}

describe('PreSolveMessageComponent', () => {
  let component: PreSolveMessageComponent;
  let fixture: ComponentFixture<PreSolveMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideMockStore({
          selectors: [
            { selector: PreSolveShipmentSelectors.selectTotalSelected, value: null },
            { selector: PreSolveVehicleSelectors.selectTotalSelected, value: null },
          ],
        }),
      ],
      declarations: [MockBasePreSolveMessageComponent, PreSolveMessageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PreSolveMessageComponent);
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
