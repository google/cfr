import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatasetComponent } from './dataset.component';
import { provideMockStore } from '@ngrx/store/testing';
import { selectScenarioName } from '../../selectors/dispatcher.selectors';

describe('DatasetComponent', () => {
  let component: DatasetComponent;
  let fixture: ComponentFixture<DatasetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DatasetComponent],
      providers: [
        provideMockStore({
          selectors: [{ selector: selectScenarioName, value: '' }],
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DatasetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
