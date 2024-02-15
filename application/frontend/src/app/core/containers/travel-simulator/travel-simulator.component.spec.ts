import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TravelSimulatorComponent } from './travel-simulator.component';

describe('TravelSimulatorComponent', () => {
  let component: TravelSimulatorComponent;
  let fixture: ComponentFixture<TravelSimulatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TravelSimulatorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TravelSimulatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
