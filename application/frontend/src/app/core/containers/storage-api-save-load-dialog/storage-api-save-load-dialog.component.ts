/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import { Component, ChangeDetectionStrategy, Input, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { select, Store } from '@ngrx/store';
import { map, take } from 'rxjs/operators';
import * as fromDownload from 'src/app/core/selectors/download.selectors';
import { OptimizeToursRequest, OptimizeToursResponse } from 'src/app/core/models';
import { DispatcherService } from '../../services';
import { Page, Scenario, Solution } from '../../models';
import { Observable } from 'rxjs';
import * as fromUI from 'src/app/core/selectors/ui.selectors';
import { selectScenarioName } from '../../selectors/dispatcher.selectors';

@Component({
  selector: 'app-storage-api-save-load-dialog',
  templateUrl: './storage-api-save-load-dialog.component.html',
  styleUrls: ['./storage-api-save-load-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorageApiSaveLoadDialogComponent implements OnInit {
  @Input() saving = false;

  onSolutionPage$: Observable<boolean>;
  scenario: OptimizeToursRequest;
  solution: OptimizeToursResponse;
  scenarioName: string;

  constructor(
    private dialogRef: MatDialogRef<StorageApiSaveLoadDialogComponent>,
    private dispatcherService: DispatcherService,
    private store: Store
  ) {}

  ngOnInit(): void {
    this.onSolutionPage$ = this.store.pipe(
      select(fromUI.selectPage),
      take(1),
      map(
        (page) => [Page.RoutesChart, Page.RoutesMetadata, Page.ShipmentsMetadata].indexOf(page) >= 0
      )
    );

    this.store
      .select(fromDownload.selectDownload)
      .pipe(take(1))
      .subscribe((res) => {
        if (!res) {
          return;
        }
        this.scenario = OptimizeToursRequest.fromObject(res.scenario);
        if (res.solution) {
          this.solution = OptimizeToursResponse.fromObject(res.solution);
        }
      });

    this.store
      .select(selectScenarioName)
      .pipe(take(1))
      .subscribe((res) => (this.scenarioName = res));
  }

  loadScenario(content: { scenario: Scenario; scenarioName: string }): void {
    this.dialogRef.close({
      scenario: this.dispatcherService.objectToScenario(content.scenario),
      scenarioName: content.scenarioName,
    });
  }

  loadSolution(content: { scenario: Scenario; solution: Solution; scenarioName: string }): void {
    this.dialogRef.close({
      scenario: this.dispatcherService.objectToScenario(content.scenario),
      solution: this.dispatcherService.objectToSolution(content.solution, { json: true }),
      scenarioName: content.scenarioName,
    });
  }
}
