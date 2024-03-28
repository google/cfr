/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import * as fromDownload from 'src/app/core/selectors/download.selectors';
import { MatDialogRef } from '@angular/material/dialog';
import { StorageApiSaveLoadDialogComponent } from './storage-api-save-load-dialog.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Component, Input } from '@angular/core';
import * as fromUI from 'src/app/core/selectors/ui.selectors';
import { OptimizeToursRequest, OptimizeToursResponse } from 'src/app/core/models';
import { selectScenarioName } from '../../selectors/dispatcher.selectors';

@Component({
  selector: 'app-base-storage-api-save-load-dialog',
  template: '',
})
class MockBaseStorageApiSaveLoadDialogComponent {
  @Input() onSolutionPage: boolean;
  @Input() saving = false;
  @Input() scenario: OptimizeToursRequest;
  @Input() solution: OptimizeToursResponse;
  @Input() scenarioName: string;
}

describe('StorageApiSaveLoadDialogComponent', () => {
  let component: StorageApiSaveLoadDialogComponent;
  let fixture: ComponentFixture<StorageApiSaveLoadDialogComponent>;
  let _matDialogRef: jasmine.SpyObj<MatDialogRef<StorageApiSaveLoadDialogComponent>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MockBaseStorageApiSaveLoadDialogComponent, StorageApiSaveLoadDialogComponent],
      imports: [HttpClientTestingModule],
      providers: [
        { provide: MatDialogRef, useValue: jasmine.createSpyObj('matDialogRef', ['close']) },
        provideMockStore({
          selectors: [
            { selector: fromDownload.selectDownload, value: null },
            { selector: fromUI.selectPage, value: '' },
            { selector: selectScenarioName, value: '' },
          ],
        }),
      ],
    }).compileComponents();
    _matDialogRef = TestBed.inject(MatDialogRef) as any;

    fixture = TestBed.createComponent(StorageApiSaveLoadDialogComponent);
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
