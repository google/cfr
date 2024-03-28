/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmOverwriteDialogComponent } from 'src/app/shared/components';
import { SearchResult, StorageFile, StoredSolution } from '../../models/storage-api';
import { UploadService } from '../../services/upload.service';
import { StorageApiService } from '../../services/storage-api.service';
import { OptimizeToursRequest, OptimizeToursResponse } from 'src/app/core/models';
import { Scenario, Solution } from '../../models';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-base-storage-api-save-load-dialog',
  templateUrl: './base-storage-api-save-load-dialog.component.html',
  styleUrls: ['./base-storage-api-save-load-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaseStorageApiSaveLoadDialogComponent implements OnChanges, OnDestroy, OnInit {
  @ViewChild('saveInput') saveInput: ElementRef;

  @Input() onSolutionPage: boolean;
  @Input() saving = false;
  @Input() scenario: OptimizeToursRequest;
  @Input() solution: OptimizeToursResponse;
  @Input() scenarioName: string;
  @Output() loadScenario = new EventEmitter<{
    scenario: Scenario;
    scenarioName: string;
  }>();
  @Output() loadSolution = new EventEmitter<{
    scenario: Scenario;
    solution: Solution;
    scenarioName: string;
  }>();

  closed = new Subject<void>();

  searchText: string;
  searchResults: SearchResult[] = [];
  columnsToDisplay = ['name', 'dateCreated', 'dateModified', 'delete'];
  selectedTab = 0;

  currentSelection: string;
  loading = false;
  loadingFile = false;

  pageSize = 50;
  pageMin = 0;
  pageMax = 0;
  pageTokens = [];
  onScenarioTab = true;
  currentPageToken: string;
  hasNextPage = false;

  filename: string;

  constructor(
    public overwriteDialog: MatDialog,
    private snackBar: MatSnackBar,
    private ref: ChangeDetectorRef,
    private service: StorageApiService,
    private uploadService: UploadService
  ) {}

  ngOnInit(): void {
    this.search();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.onSolutionPage) {
      this.selectedTab = 1;
      this.changeTab(1);
    }

    if (changes.scenarioName) {
      this.filename = this.scenarioName;
    }
  }

  ngOnDestroy(): void {
    this.closed.next();
    this.closed.complete();
  }

  changeTab(tabIndex: number): void {
    this.onScenarioTab = tabIndex === 0;
    this.searchResults = [];
    this.pageTokens = [];
    this.search();
  }

  prevPage(): void {
    this.currentPageToken = this.pageTokens.pop();
    this.search(this.currentPageToken);
  }

  nextPage(): void {
    this.pageTokens.push(this.currentPageToken);
    this.currentPageToken = this.searchResults[0].pageToken.pageToken;
    this.search(this.currentPageToken);
  }

  updatePageLimits(): void {
    this.pageMin = this.pageTokens.length * this.pageSize + 1;
    this.pageMax =
      Math.min(this.pageMin + this.pageSize, this.pageMin + this.searchResults.length) - 1;
  }

  search(pageToken?: string): void {
    this.loading = true;
    this.service
      .search(this.onScenarioTab, this.searchText, pageToken, this.pageSize)
      .pipe(takeUntil(this.closed))
      .subscribe(
        (result) => this.loadSearchResults(result),
        () => this.displayError('Error retrieving data'),
        () => {
          this.loading = false;
          this.ref.detectChanges();
        }
      );
  }

  loadSearchResults(results: SearchResult[] = []): void {
    this.searchResults = results;
    this.hasNextPage = this.searchResults.length && !!this.searchResults[0].pageToken?.pageToken;
    this.currentSelection = '';
    this.updatePageLimits();
  }

  clearSearchText(): void {
    this.searchText = '';
  }

  selectFile(selection: { name: string; dateModified: string }): void {
    if (!this.loadingFile) {
      this.currentSelection = selection.name;
      this.filename = selection.name;
      if (this.saving) {
        this.saveInput.nativeElement.focus();
      }
    }
  }

  displayError(message: string): void {
    this.loading = false;
    this.loadingFile = false;
    this.snackBar.open(message, 'Dismiss', {
      panelClass: ['api-error-snackbar'],
    });
    this.ref.detectChanges();
  }

  accept(): void {
    if (this.saving) {
      this.beginSaveFile();
    } else {
      this.loadFile();
    }
  }

  beginSaveFile(): void {
    this.loadingFile = true;
    this.service
      .exists(this.filename, this.onScenarioTab)
      .pipe(takeUntil(this.closed))
      .subscribe((res) => (res.status ? this.confirmOverwrite(res.name) : this.saveFile()));
  }

  saveFile(): void {
    let data;
    if (this.onScenarioTab) {
      data = this.scenario;
    } else {
      data = {
        scenario: this.scenario,
        solution: this.solution,
      };
    }

    this.service
      .saveFile(data, this.filename, this.onScenarioTab)
      .pipe(takeUntil(this.closed))
      .subscribe(
        () => this.completeSaveFile(),
        (_error) => this.displayError('Error saving data')
      );
  }

  confirmOverwrite(name: string): void {
    this.overwriteDialog
      .open(ConfirmOverwriteDialogComponent, {
        data: {
          filename: name,
        },
      })
      .afterClosed()
      .subscribe((res) => {
        if (res) {
          this.saveFile();
        } else {
          this.loadingFile = false;
        }
        this.ref.detectChanges();
      });
  }

  completeSaveFile(): void {
    this.loadingFile = false;
    this.snackBar
      .open('Saved successfully', 'Dismiss', {
        duration: 3000,
        panelClass: ['api-success-snackbar'],
      })
      .afterOpened()
      .subscribe(() => {
        this.search(this.currentPageToken);
      });
  }

  loadFile(): void {
    this.loadingFile = true;
    this.service
      .loadFile(this.currentSelection, this.onScenarioTab)
      .pipe(takeUntil(this.closed))
      .subscribe(
        (res) =>
          this.onScenarioTab
            ? this.loadScenarioFromFile(res as StorageFile)
            : this.loadSolutionFromFile(res as StoredSolution),
        (_error) => this.displayError('Error retrieving data'),
        () => {
          this.loadingFile = false;
          this.ref.detectChanges();
        }
      );
  }

  loadSolutionFromFile(result: StoredSolution): void {
    if (
      !result.scenario ||
      !result.solution ||
      this.uploadService.validateScenarioFormat(result.scenario) ||
      this.uploadService.validateSolutionFormat(result.solution)
    ) {
      this.validationError();
      return;
    }

    this.loadSolution.emit({
      scenario: result.scenario,
      solution: result.solution,
      scenarioName: result.name.replace(/\.[^/.]+$/, ''),
    });
  }

  loadScenarioFromFile(result: StorageFile): void {
    if (!result.fileContent || this.uploadService.validateScenarioFormat(result.fileContent)) {
      this.validationError();
      return;
    }
    this.loadScenario.emit({
      scenario: result.fileContent,
      scenarioName: result.name.replace(/\.[^/.]+$/, ''),
    });
  }

  confirmDelete(selection: SearchResult): void {
    this.overwriteDialog
      .open(ConfirmDialogComponent, {
        data: {
          title: 'Confirm delete',
          message: 'Delete file <span class="mat-body-strong">' + selection.name + '</span>',
        },
      })
      .afterClosed()
      .subscribe((res) => res && this.deleteFile(selection));
  }

  deleteFile(selection: SearchResult): void {
    this.loadingFile = true;
    this.ref.detectChanges();
    this.service
      .deleteFile(selection.name, this.onScenarioTab)
      .pipe(takeUntil(this.closed))
      .subscribe(
        () => this.completeDeleteFile(),
        () => this.displayError('Error deleting data')
      );
  }

  completeDeleteFile(): void {
    this.loadingFile = false;
    this.snackBar.open('File deleted successfully', 'Dismiss', {
      duration: 3000,
      panelClass: ['api-success-snackbar'],
    });
    this.search(this.currentPageToken);
    this.ref.detectChanges();
  }

  validationError(): void {
    this.snackBar.open('Invalid format', 'Dismiss', {
      panelClass: ['api-error-snackbar'],
    });
  }
}
