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
  ChangeDetectionStrategy,
  OnInit,
  ChangeDetectorRef,
  OnDestroy,
} from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { combineLatest, of, Subscription } from 'rxjs';
import { CsvData, DeckGLRoute, Vehicle } from '../../models';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileService } from '../../services';
import { catchError, first, mergeMap } from 'rxjs/operators';
import * as fromRouteLayer from 'src/app/core/selectors/route-layer.selectors';
import VisitSelectors from '../../selectors/visit.selectors';
import { PdfDownloadService } from '../../services/pdf-download.service';
import PreSolveVehicleSelectors from '../../selectors/pre-solve-vehicle.selectors';

enum GenerationState {
  Waiting,
  RenderingMaps,
  BuildingDocument,
  Complete,
  Error,
}

@Component({
  selector: 'app-download-pdf-dialog',
  templateUrl: './download-pdf-dialog.component.html',
  styleUrls: ['./download-pdf-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DownloadPdfDialogComponent implements OnInit, OnDestroy {
  mapSizeInches = {
    width: 7.5,
    height: 4,
  };
  mapMarginInches = {
    x: 0.5,
    y: 0.5,
  };

  pageLayout: any = {
    orientation: 'portrait',
    unit: 'in',
    format: 'letter',
  };
  tableKeys = [];

  GenerationState = GenerationState;
  state = GenerationState.Waiting;
  errorMessage: string;

  mapSubscription: Subscription;

  renderedMaps: any[] = [];
  report: Blob;

  scenarioName: string;

  csvData: Partial<CsvData>[] = [];
  routes: DeckGLRoute[];
  vehicles: Vehicle[];

  pageNumber = 0;
  routeIndex = 0;
  totalRoutes = 0;

  constructor(
    private changeDetector: ChangeDetectorRef,
    private fileService: FileService,
    private modalRef: MatDialogRef<DownloadPdfDialogComponent>,
    private service: PdfDownloadService,
    private store: Store
  ) {}

  ngOnInit(): void {
    // Map all keys from CSV data except the vehicle index and label, since that will be included in the title for each page
    const uniqueKeys = new Set();
    this.csvData.forEach((entry) =>
      Object.keys(entry).forEach((key) => {
        if (key.toLowerCase() !== 'vehicle index' && key.toLowerCase() !== 'vehicle label') {
          uniqueKeys.add(key);
        }
      })
    );
    this.tableKeys = Array.from(uniqueKeys);
  }

  ngOnDestroy(): void {
    if (this.mapSubscription) {
      this.mapSubscription.unsubscribe();
    }
  }

  beginGeneration(useSelectedRoutes: boolean): void {
    this.pageNumber = 0;
    this.state = GenerationState.RenderingMaps;
    this.changeDetector.detectChanges();

    this.mapSubscription = combineLatest([
      this.store.select(fromRouteLayer.selectRoutes),
      this.store.select(fromRouteLayer.selectFilteredRoutesSelected),
      this.store.select(VisitSelectors.selectVisitRequests),
      this.store.select(PreSolveVehicleSelectors.selectVehicles),
    ])
      .pipe(
        first(),
        mergeMap(([allRoutes, selectedRoutes, visitRequests, vehicles]) => {
          this.vehicles = vehicles;
          this.routes = useSelectedRoutes && selectedRoutes.length ? selectedRoutes : allRoutes;

          return this.service.getStaticMaps(this.routes, visitRequests);
        }),
        catchError((err) => {
          this.state = GenerationState.Error;
          this.errorMessage = err.message || err;
          this.changeDetector.detectChanges();
          return of(err);
        })
      )
      .subscribe((res) => {
        if (this.state === GenerationState.Error) {
          return;
        }
        this.renderedMaps = res;
        this.buildReport();
      });
  }

  buildReport(): void {
    this.state = GenerationState.BuildingDocument;
    this.changeDetector.detectChanges();

    const doc = new jsPDF(this.pageLayout);
    this.renderedMaps.forEach((render) => this.addRoutePage(doc, render.map, render.routeId));
    this.report = doc.output('blob');
    this.state = GenerationState.Complete;
    this.downloadReport();
    this.changeDetector.detectChanges();
  }

  addRoutePage(doc: jsPDF, mapData: string, routeId: number): void {
    if (this.pageNumber > 0) {
      doc.addPage(this.pageLayout);
    }

    const route = this.routes.find((r) => r.id === routeId);
    const vehicleIndex = route.vehicleIndex || 0;
    const vehicleOperatorIndices =
      route.vehicleOperatorIndices?.length > 0 ? route.vehicleOperatorIndices.join(',') : '';
    const vehicleOperatorLabels =
      route.vehicleOperatorLabels?.length > 0 ? route.vehicleOperatorLabels.join(',') : '';
    this.addTitle(doc, vehicleIndex, this.vehicles[vehicleIndex].label);
    if (vehicleOperatorIndices || vehicleOperatorLabels) {
      this.addVehicleOperatorDetails(doc, vehicleOperatorIndices, vehicleOperatorLabels);
    }
    doc.addImage(
      mapData,
      'PNG',
      this.mapMarginInches.x,
      this.mapMarginInches.y * 2.3,
      this.mapSizeInches.width,
      this.mapSizeInches.height
    );
    this.addTable(doc, vehicleIndex);

    this.pageNumber++;
  }

  addTitle(doc: jsPDF, vehicleIndex: number, label: string): void {
    const title = `Route for Vehicle #${vehicleIndex}` + (label ? ` - ${label}` : '');
    const splitTitle = doc.setFont(undefined, 'bold').splitTextToSize(title, 7.5);
    doc.text(splitTitle, 8.5 / 2, 0.5, { align: 'center' });
  }

  addVehicleOperatorDetails(doc: jsPDF, vehicleOperatorIndices: string, label: string): void {
    const title = `Vehicle Operator # ${vehicleOperatorIndices}` + (label ? ` - ${label}` : '');
    const splitTitle = doc.setFont(undefined, 'bold').splitTextToSize(title, 7.5);
    doc.text(splitTitle, 8.5 / 2, 1.0, { align: 'center' });
  }

  addTable(doc, vehicleIndex: number): void {
    doc.setFont(undefined, 'normal');

    autoTable(doc, {
      head: [this.tableKeys],
      body: this.csvData
        .filter((data) => data['Vehicle index'] === vehicleIndex)
        .map((data) => this.tableKeys.map((key) => (key in data ? data[key] : ''))),
      startY: 5.35,
      headStyles: {
        fillColor: '#555',
        textColor: '#fcfcfc',
      },
      rowPageBreak: 'avoid',
    });
  }

  downloadReport(): void {
    const filename = this.scenarioName.length ? this.scenarioName : 'routes';
    this.fileService.download(`${filename}.pdf`, [this.report], 'application/pdf');
  }

  cancel(): void {
    this.modalRef.close();
  }

  getTitle(): string {
    switch (this.state) {
      case GenerationState.Waiting:
        return 'Select routes to export';
      case GenerationState.Complete:
        return 'Report generated!';
      default:
        return 'Generating PDF';
    }
  }
}
