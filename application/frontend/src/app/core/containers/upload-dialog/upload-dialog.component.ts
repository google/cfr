/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import { ChangeDetectionStrategy, Component, ElementRef, ViewChild } from '@angular/core';
import {
  FormGroupDirective,
  NgForm,
  UntypedFormBuilder,
  UntypedFormControl,
  UntypedFormGroup,
  ValidationErrors,
} from '@angular/forms';
import { MatDialog, MatDialogRef, MatDialogState } from '@angular/material/dialog';
import { select, Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { merge } from 'lodash';

import * as fromRoot from 'src/app/reducers';
import { Scenario, ScenarioSolutionPair, Solution } from '../../models';
import { UploadType } from '../../models/upload';
import { IWaypoint } from '../../models/dispatcher.model';
import { DispatcherService, FileService, PlacesService, UploadService } from '../../services';
import { toDispatcherLatLng } from 'src/app/util';
import { ScenarioSolutionHelpDialogComponent } from 'src/app/core/containers/scenario-solution-help-dialog/scenario-solution-help-dialog.component';
import { UploadActions } from '../../actions';
import { CsvHelpDialogComponent } from '../csv-help-dialog/csv-help-dialog.component';
import { ErrorStateMatcher } from '@angular/material/core';

class FileUploadErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(
    control: UntypedFormControl | null,
    ngForm: FormGroupDirective | NgForm | null
  ): boolean {
    const invalid =
      ngForm?.errors?.required ||
      ngForm.errors?.zipContents ||
      ngForm.errors?.fileFormat ||
      ngForm.errors?.requestFormat ||
      control?.invalid;
    const show = ngForm?.touched && ngForm?.dirty;
    return !!(invalid && show);
  }
}

@Component({
  selector: 'app-upload-dialog',
  templateUrl: './upload-dialog.component.html',
  styleUrls: ['./upload-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class UploadDialogComponent {
  @ViewChild('fileInput', { static: true }) fileInput: ElementRef<HTMLInputElement>;

  readonly fileUploadErrorStateMatcher = new FileUploadErrorStateMatcher();
  readonly form: UntypedFormGroup;
  readonly fileName: UntypedFormControl;
  fileInvalid: boolean;
  validatingUpload: boolean;
  private json: any;
  private _scenario: Scenario;
  private get scenario(): Scenario {
    return this._scenario || this.scenarioSolutionPair?.scenario;
  }
  private set scenario(value: Scenario) {
    this._scenario = value;
  }
  private scenarioSolutionPair: ScenarioSolutionPair;
  zipContentsInvalid: boolean;
  zipContentCountInvalid: boolean;
  zipMissingScenario: boolean;
  zipMissingSolution: boolean;

  selectedFilename: string;

  resolvingPlaceIds = false;
  placeIdProgress = 0;
  placeIdError: string;
  get placeIdCount(): number {
    return this.scenarioWaypointsWithPlaceIDs.length;
  }

  constructor(
    private store: Store<fromRoot.State>,
    private dialogRef: MatDialogRef<UploadDialogComponent>,
    private dialog: MatDialog,
    private dispatcherService: DispatcherService,
    private fileService: FileService,
    private placesService: PlacesService,
    private uploadService: UploadService,
    fb: UntypedFormBuilder
  ) {
    this.form = fb.group({
      fileName: (this.fileName = fb.control('', [this.fileValidator.bind(this)])),
    });
  }

  openScenarioSolutionHelp(): void {
    this.dialog.open(ScenarioSolutionHelpDialogComponent, {
      maxWidth: '600px',
    });
  }

  openCsvHelp(): void {
    this.dialog.open(CsvHelpDialogComponent, {
      maxWidth: '600px',
    });
  }

  loadFromCsv(): void {
    this.dialogRef.close();
    this.store.dispatch(UploadActions.openCsvDialog({ openUploadDialogOnClose: true }));
  }

  cancel(): void {
    this.dialogRef.close();
  }

  solve(): void {
    this.dialogRef.close({
      uploadType: this.scenarioSolutionPair ? UploadType.ScenarioSolutionPair : UploadType.Scenario,
      content: this.scenarioSolutionPair ? this.scenarioSolutionPair : this.scenario,
      scenarioName: this.selectedFilename,
    });
  }

  selectFile(): void {
    if (!this.fileInput) {
      return;
    }
    this.fileInput.nativeElement.click();
    this.fileName.markAsTouched();
  }

  fileUploadClicked(e: MouseEvent): void {
    (e.target as HTMLInputElement).value = null;
  }

  onCancelSelectFile(): void {
    this.fileName.markAsDirty();
  }

  async fileSelected(e: Event): Promise<void> {
    this.fileName.markAsDirty();
    const target = e.target as HTMLInputElement;
    const file = target && target.files && target.files[0];
    if (!file) {
      return;
    }

    this.selectedFilename = file.name.replace(/\.[^/.]+$/, '');

    this.validatingUpload = true;

    // First check if the file is valid JSON
    let json: any = null;
    this.fileInvalid = false;
    try {
      const text = await this.fileService.readAsText(file);
      json = JSON.parse(text);
    } catch (error) {
      this.fileInvalid = true;
      json = null;
    }

    if (!this.fileInvalid && json) {
      // Set json and scenario value before fileName value for validation
      this.json = json;
      this.scenario = null;
      this.fileName.setValue(file.name);
      this.validatingUpload = false;

      if (!this.scenarioHasPlaceIds && this.fileName.valid) {
        this.solve();
      }

      return;
    }

    this.json = false;
    this.scenario = null;

    // If file is not valid JSON, check if it's a ZIP
    this.fileInvalid = false;
    this.zipContentsInvalid = false;
    let fileIsZip = false;

    try {
      await this.fileService.unzip(file);
      fileIsZip = true;
      const files = await this.fileService.getJSONFromZip(file);
      this.scenarioSolutionPair = this.loadZipContents(files);
    } catch (err) {
      if (fileIsZip) {
        this.zipContentsInvalid = true;
      } else {
        this.fileInvalid = true;
      }
    }
    this.validatingUpload = false;
    this.fileName.setValue(file.name);

    if (
      !this.zipContentsInvalid &&
      !this.fileInvalid &&
      !this.scenarioHasPlaceIds &&
      this.fileName.valid
    ) {
      this.solve();
    }
  }

  get scenarioHasPlaceIds(): boolean {
    return this.scenarioWaypointsWithPlaceIDs.length > 0;
  }

  private get scenarioWaypoints(): IWaypoint[] {
    return [
      this.scenario?.model?.shipments?.flatMap((shipment) =>
        shipment.pickups
          ?.flatMap((pickup) => [pickup.arrivalWaypoint, pickup.departureWaypoint])
          .concat(
            shipment.deliveries?.flatMap((delivery) => [
              delivery.arrivalWaypoint,
              delivery.departureWaypoint,
            ])
          )
      ),
      this.scenario?.model?.vehicles?.flatMap((vehicle) => [
        vehicle.startWaypoint,
        vehicle.endWaypoint,
      ]),
    ]
      .flat()
      .filter((waypoint) => !!waypoint);
  }

  private get scenarioWaypointsWithPlaceIDs(): IWaypoint[] {
    return this.scenarioWaypoints.filter((waypoint) => !!waypoint.placeId);
  }

  private resetResolvingPlaceIds(): void {
    this.placeIdProgress = 0;
    this.resolvingPlaceIds = false;
  }

  /**
   * For all waypoints in the `scenario` with Place IDs,
   * set the lat/lng location of the waypoint
   * from a Place Details request.
   */
  async resolveWaypointPlaceIds(): Promise<void> {
    if (this.scenarioHasPlaceIds) {
      this.resolvingPlaceIds = true;
      this.placeIdProgress = 0;
      this.placeIdError = null;

      for (const waypoint of this.scenarioWaypointsWithPlaceIDs) {
        // stop if the user has clicked the cancel button
        if (this.dialogRef.getState() === MatDialogState.CLOSED) {
          this.resetResolvingPlaceIds();
          break;
        }

        try {
          const placeResult = await this.placesService.getDetails(waypoint.placeId);

          waypoint.location = merge(waypoint.location, {
            latLng: toDispatcherLatLng(placeResult.geometry.location),
          });

          this.placeIdProgress++;
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(err);
          this.placeIdError = `Place ID lookup failed: ${err}`;
          this.resetResolvingPlaceIds();
          break;
        }
      }

      this.resolvingPlaceIds = false;

      if (!this.placeIdError) {
        this.solve();
      }
    }
  }

  fileValidator(control: UntypedFormControl): ValidationErrors | null {
    if (this.fileInvalid) {
      return { fileFormat: true };
    }
    if (this.zipContentsInvalid) {
      return { zipContents: true };
    }
    if (!(typeof control.value === 'string') || control.value.trim().length === 0) {
      return { required: true };
    }
    if (this.json) {
      return this.scenarioValidator(control);
    }
  }

  loadZipContents(files: { content: JSON; filename: string }[]): ScenarioSolutionPair {
    this.zipContentCountInvalid = false;
    this.zipMissingScenario = false;
    this.zipMissingSolution = false;

    if (files.length !== 2) {
      this.zipContentCountInvalid = true;
      throw new Error('Incorrect number of files');
    }

    let scenario;
    let solution;
    files.forEach((file) => {
      if (!scenario || !Object.keys(scenario).length) {
        scenario = this.validateScenario(file.content);
      }

      if (!solution || !Object.keys(solution).length) {
        solution = this.validateSolution(file.content);
      }
    });

    if (!scenario) {
      this.zipMissingScenario = true;
      throw new Error('Missing scenario.json');
    }

    if (!solution) {
      this.zipMissingSolution = true;
      throw new Error('Missing solution.json');
    }

    return { scenario, solution };
  }

  getZipErrorMessage(): string {
    if (this.zipContentCountInvalid) {
      return 'The zip contains an invalid number of .json files, or the .json files within are invalid.';
    }
    if (this.zipMissingScenario) {
      return 'The provided zip is missing a valid scenario file.';
    }

    if (this.zipMissingSolution) {
      return 'The provided zip is missing a valid solution file.';
    }

    return 'The provided zip contains invalid contents.';
  }

  /**
   * Returns scenario validation errors
   *
   * @remarks
   * Only validates the message/value structure
   */
  scenarioValidator(_: UntypedFormControl): ValidationErrors | null {
    try {
      const scenario = this.validateScenario(this.json);

      if (this.scenario == null) {
        this.scenario = scenario;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('Invalid request format:', error);
      return { requestFormat: true };
    }
    return null;
  }

  validateScenario(json: any): Scenario {
    const validationResult = this.uploadService.validateScenarioFormat(json);
    if (validationResult) {
      throw validationResult;
    }

    return this.dispatcherService.objectToScenario(json);
  }

  validateSolution(json: any): Solution {
    const validationResult = this.uploadService.validateSolutionFormat(json);
    if (validationResult) {
      throw validationResult;
    }

    return this.dispatcherService.objectToSolution(json);
  }
}
