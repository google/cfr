/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import { Injectable, Inject, LOCALE_ID } from '@angular/core';
import { formatDate } from '@angular/common';
import { select, Store } from '@ngrx/store';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { FileService, MessageService } from '../services';
import {
  download,
  downloadSuccess,
  downloadFailure,
  downloadCSV,
  downloadPDF,
} from '../actions/download.actions';
import {
  switchMap,
  map,
  catchError,
  first,
  mergeMapTo,
  filter,
  exhaustMap,
  mergeMap,
} from 'rxjs/operators';
import { of, defer, throwError, zip } from 'rxjs';
import {
  CsvData,
  CSV_COLUMN_ORDER,
  CSV_DATA_LABELS,
  CSV_DATA_LABELS_ABBREVIATED,
  IInjectedSolution,
  ILatLng,
  IOptimizeToursRequest,
  IOptimizeToursResponse,
  IShipment,
  IShipmentRoute,
  IVehicle,
  IVisit,
  OptimizeToursRequest,
  OptimizeToursResponse,
} from 'src/app/core/models';
import * as fromRoot from 'src/app/reducers';
import * as fromDownload from '../selectors/download.selectors';
import { unparse } from 'papaparse';
import { durationSeconds, formattedDurationSeconds } from 'src/app/util';
import { Modal } from '../models';
import * as fromUI from '../selectors/ui.selectors';
import { MatDialog } from '@angular/material/dialog';
import { DownloadPdfDialogComponent } from '../containers/download-pdf-dialog/download-pdf-dialog.component';
import protobuf from 'protobufjs';
import { ExtendedConversionOptions } from 'src/app/util/canonical-protobuf';
import { selectScenarioName } from '../selectors/dispatcher.selectors';

@Injectable()
export class DownloadEffects {
  startPdfDownload$ = createEffect(() =>
    this.actions$.pipe(
      ofType(downloadPDF),
      mergeMapTo(this.store.pipe(select(fromUI.selectModal), first())),
      filter(
        (modal) => modal === Modal.DownloadPDF && !this.dialog.getDialogById(Modal.DownloadPDF)
      ),
      switchMap(() =>
        zip(
          this.store.select(fromDownload.selectDownload).pipe(first()),
          this.store.select(selectScenarioName).pipe(first())
        )
      ),
      exhaustMap(([data, scenarioName]) => {
        const csvData = this.getCsvDataForSolution(data, false);
        const dialog = this.dialog.open(DownloadPdfDialogComponent, {
          id: Modal.DownloadPDF,
          width: '600px',
          height: '300px',
          disableClose: true,
        });
        dialog.componentInstance.csvData = this.csvDataToLabeledCsvData(csvData, true);
        dialog.componentInstance.scenarioName = scenarioName;
        return dialog.afterClosed();
      }),
      mergeMap((_) => {
        return [];
      })
    )
  );

  startCsvDownload$ = createEffect(() =>
    this.actions$.pipe(
      ofType(downloadCSV),
      switchMap(() => this.store.select(fromDownload.selectDownload).pipe(first())),
      switchMap((data) =>
        defer(() => {
          if (!data.solution) {
            throwError('No solution to download');
          }
          const csvData = this.getCsvDataForSolution(data, true);
          const labeledCsvData = this.csvDataToLabeledCsvData(csvData);

          const uniqueKeysSet = new Set();
          csvData.forEach((entry) => Object.keys(entry).forEach((key) => uniqueKeysSet.add(key)));

          const csvColumns = Array.from(uniqueKeysSet)
            .sort((a: string, b: string) =>
              CSV_COLUMN_ORDER.indexOf(a) < CSV_COLUMN_ORDER.indexOf(b) ? -1 : 1
            )
            .map((key: string) => this.getColumnLabel(key));

          return zip(
            of(unparse({ fields: csvColumns, data: labeledCsvData })),
            this.store.select(selectScenarioName).pipe(first())
          );
        }).pipe(
          map(([csvData, scenarioName]) => {
            const blob = new Blob([csvData], { type: 'text/csv' });
            const name = scenarioName.length
              ? scenarioName
              : 'routes_' + formatDate(new Date(), 'yyyyMMddHHmmss', this.locale, 'UTC') + '.csv';
            this.fileService.download(name, [csvData], 'text/csv');
            return downloadSuccess({ name, blob });
          }),
          catchError((error) => {
            this.messageService.error(this.messageService.messages.downloadFailure + ' : ' + error);
            return of(downloadFailure({ error }));
          })
        )
      )
    )
  );

  startDownload$ = createEffect(() =>
    this.actions$.pipe(
      ofType(download),
      switchMap(() => this.store.select(fromDownload.selectDownload).pipe(first())),
      switchMap((data) =>
        defer(() => {
          const files: { [name: string]: string } = {};
          // Temporarily switch JSON output to REST format rather than gRPC for downloads
          protobuf.util.toJSONOptions = {
            json: true,
            longs: String,
            canonical: true,
          } as ExtendedConversionOptions;

          const scenario = OptimizeToursRequest.fromObject(data.scenario);

          files['scenario.json'] = JSON.stringify(scenario.toJSON(), null, 2);
          if (data.solution) {
            const solution = OptimizeToursResponse.fromObject(data.solution);
            files['solution.json'] = JSON.stringify(solution.toJSON(), null, 2);
          }

          protobuf.util.toJSONOptions = {
            json: true,
            longs: String,
            canonical: false,
          } as ExtendedConversionOptions;
          return of(files);
        }).pipe(
          switchMap((files) =>
            zip(this.fileService.zip(files), this.store.select(selectScenarioName).pipe(first()))
          ),
          map(([blob, scenarioName]) => {
            const name = scenarioName.length
              ? scenarioName
              : 'gmpro_' + formatDate(new Date(), 'yyyyMMddHHmmss', this.locale, 'UTC');
            this.fileService.download(name, [blob], 'application/zip');
            return downloadSuccess({ name, blob });
          }),
          catchError((error) => {
            this.messageService.error(this.messageService.messages.downloadFailure + ' : ' + error);
            return of(downloadFailure({ error }));
          })
        )
      )
    )
  );

  csvDataToLabeledCsvData(csvData: Partial<CsvData>[], useAbbreviatedNames?: boolean): any {
    return csvData.map((csvEntry) => {
      const labeledEntry = {};
      Object.keys(csvEntry).forEach((key) => {
        const label = this.getColumnLabel(key, useAbbreviatedNames);
        labeledEntry[label] = csvEntry[key];
      });
      return labeledEntry;
    });
  }

  getColumnLabel(key: string, useAbbreviatedNames?: boolean): string {
    return useAbbreviatedNames && CSV_DATA_LABELS_ABBREVIATED[key]
      ? CSV_DATA_LABELS_ABBREVIATED[key]
      : CSV_DATA_LABELS[key];
  }

  getCsvDataForSolution(
    data: {
      injectedSolution?: IInjectedSolution;
      scenario: IOptimizeToursRequest;
      solution?: IOptimizeToursResponse;
    },
    includeLocation?: boolean
  ): Partial<CsvData>[] {
    const csvData: Partial<CsvData>[] = [];

    data.solution.routes.forEach((route) => {
      const vehicle = data.scenario.model.vehicles[route.vehicleIndex || 0];
      const vehicleOperatorIndices =
        route.vehicleOperatorIndices?.length > 0 ? route.vehicleOperatorIndices.join(',') : '';
      const vehicleOperatorLabels =
        route.vehicleOperatorLabels?.length > 0 ? route.vehicleOperatorLabels.join(',') : '';

      if (vehicle.startWaypoint) {
        csvData.push({
          vehicleIndex: route.vehicleIndex || 0,
          vehicleLabel: vehicle.label,
          vehicleOperatorIndices: vehicleOperatorIndices,
          vehicleOperatorLabels: vehicleOperatorLabels,
          visitType: 'Start of day',
          visitEnd: new Date(
            durationSeconds(route.vehicleStartTime).toNumber() * 1000
          ).toUTCString(),
          timeToNextStop: formattedDurationSeconds(
            durationSeconds(route.visits[0]?.startTime || route.vehicleEndTime)
              .subtract(durationSeconds(route.vehicleStartTime))
              .toNumber()
          ),
        });
      }

      route.visits.forEach((visit, index) => {
        const visitData = this.parseVisitData(
          vehicle,
          data.scenario.model.shipments,
          route,
          visit,
          index
        );
        const visitEntry = this.buildVisitEntry(visit, route, vehicle, visitData);

        if (includeLocation) {
          visitEntry.location = `${visitData.location.latitude}, ${visitData.location.longitude}`;
        }

        csvData.push(visitEntry);
      });

      if (vehicle.endWaypoint) {
        csvData.push({
          vehicleIndex: route.vehicleIndex || 0,
          vehicleLabel: vehicle.label,
          visitType: 'End of day',
          visitStart: new Date(
            durationSeconds(route.vehicleEndTime).toNumber() * 1000
          ).toUTCString(),
        });
      }
    });

    data.solution.skippedShipments?.forEach((shipment) => {
      const shipmentData = {
        vehicleLabel: 'SKIPPED',
        shipmentIndex: shipment.index || 0,
        shipmentLabel: shipment.label,
      };

      csvData.push(shipmentData);
    });

    return csvData;
  }

  buildVisitEntry(
    visit: IVisit,
    route: IShipmentRoute,
    vehicle: IVehicle,
    data: {
      visitStart: string;
      visitEnd: string;
      timeToNextStop: string;
      location: ILatLng;
    }
  ): Partial<CsvData> {
    return {
      vehicleIndex: route.vehicleIndex || 0,
      vehicleLabel: vehicle.label,
      visitType: visit.isPickup ? 'Pickup' : 'Delivery',
      visitLabel: visit.visitLabel,
      visitStart: data.visitStart,
      visitEnd: data.visitEnd,
      shipmentIndex: visit.shipmentIndex || 0,
      shipmentLabel: visit.shipmentLabel,
      timeToNextStop: data.timeToNextStop,
    };
  }

  parseVisitData(
    vehicle: IVehicle,
    shipments: IShipment[],
    route: IShipmentRoute,
    visit: IVisit,
    visitIndex: number
  ): {
    visitStart: string;
    visitEnd: string;
    timeToNextStop: string;
    location: ILatLng;
  } {
    const shipment = shipments[visit.shipmentIndex || 0];
    const visitRequest = visit.isPickup
      ? shipment.pickups[visit.visitRequestIndex || 0]
      : shipment.deliveries[visit.visitRequestIndex || 0];
    const startSeconds = durationSeconds(visit.startTime);
    const endSeconds = durationSeconds(visitRequest.duration).add(startSeconds);
    let timeToNextStop = null;
    if (visitIndex < route.visits.length - 1) {
      timeToNextStop = formattedDurationSeconds(
        durationSeconds(route.visits[visitIndex + 1].startTime)
          .subtract(endSeconds)
          .toNumber()
      );
    } else if (vehicle.endWaypoint) {
      timeToNextStop = formattedDurationSeconds(
        durationSeconds(route.vehicleEndTime).subtract(endSeconds).toNumber()
      );
    }

    const visitStart = new Date(1000 * startSeconds.toNumber()).toUTCString();
    const visitEnd = new Date(1000 * endSeconds.toNumber()).toUTCString();

    return {
      visitStart,
      visitEnd,
      timeToNextStop,
      location: visitRequest.arrivalWaypoint?.location?.latLng,
    };
  }

  constructor(
    @Inject(LOCALE_ID) private locale: string,
    private actions$: Actions,
    private dialog: MatDialog,
    private store: Store<fromRoot.State>,
    private fileService: FileService,
    private messageService: MessageService
  ) {}
}
