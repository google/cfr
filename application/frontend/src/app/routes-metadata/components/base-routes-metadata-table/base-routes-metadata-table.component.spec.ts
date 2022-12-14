/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconRegistry } from '@angular/material/icon';
import { of } from 'rxjs';
import { MaterialModule } from 'src/app/material';
import { DataSource } from 'src/app/shared/models';
import { SharedModule } from 'src/app/shared/shared.module';
import { FakeMatIconRegistry } from 'src/test/material-fakes';
import { RouteMetadata } from '../../models';
import { BaseRoutesMetadataTableComponent } from './base-routes-metadata-table.component';
import { provideMockStore } from '@ngrx/store/testing';
import { selectAllowExperimentalFeatures } from '../../../core/selectors/config.selectors';

describe('BaseRoutesMetadataTableComponent', () => {
  let component: BaseRoutesMetadataTableComponent;
  let fixture: ComponentFixture<BaseRoutesMetadataTableComponent>;
  let dataSource: jasmine.SpyObj<DataSource<RouteMetadata>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaterialModule, SharedModule],
      declarations: [BaseRoutesMetadataTableComponent],
      providers: [
        provideMockStore({
          selectors: [{ selector: selectAllowExperimentalFeatures, value: false }],
        }),
      ],
    })
      .overrideProvider(MatIconRegistry, { useFactory: () => new FakeMatIconRegistry() })
      .compileComponents();

    dataSource = jasmine.createSpyObj('dataSource', ['attach', 'connect', 'disconnect']);
    dataSource.connect.and.callFake(() => of([]));

    fixture = TestBed.createComponent(BaseRoutesMetadataTableComponent);
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
