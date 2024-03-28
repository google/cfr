/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MaterialModule } from '../material';
import { SharedModule } from '../shared/shared.module';
import {
  BaseDocumentationDialogComponent,
  BaseEditShipmentDialogComponent,
  BaseEditVehicleDialogComponent,
  BaseEditVisitDialogComponent,
  BaseGenerateButtonComponent,
  BaseMainNavComponent,
  BasePostSolveMetricsComponent,
  BasePreSolveMessageComponent,
  BaseRegenerateConfirmationDialogComponent,
  BaseStorageApiSaveLoadDialogComponent,
  BaseShipmentsKpisComponent,
  BaseValidationResultDialogComponent,
  BaseVehicleInfoWindowComponent,
  BodyComponent,
  BaseVehiclesKpisComponent,
  BaseVehicleOperatorsKpisComponent,
  BaseVisitRequestInfoWindowComponent,
  HideMapButtonComponent,
  LogoComponent,
  MapToggleButtonComponent,
  MapTypeButtonComponent,
  MessageSnackBarComponent,
  PostSolveTimelineLegendComponent,
  ProgressBarComponent,
  SelectMapItemsButtonComponent,
  SharedDefsComponent,
  SideBarComponent,
  TimeNavigationComponent,
  ToggleSelectionFilterButtonComponent,
  ZoomHomeButtonComponent,
  BasePostSolveMessageComponent,
} from './components';
import {
  AppComponent,
  DocumentationDialogComponent,
  EditGlobalRelaxationConstraintsDialogComponent,
  EditVisitDialogComponent,
  FormMapComponent,
  GenerateButtonComponent,
  MainActionsComponent,
  MainNavComponent,
  MapComponent,
  MapWrapperComponent,
  MetadataControlBarComponent,
  PostSolveControlBarComponent,
  PostSolveMessageComponent,
  PostSolveMetricsComponent,
  PreSolveControlBarComponent,
  PreSolveEditShipmentDialogComponent,
  PreSolveEditVehicleDialogComponent,
  PreSolveSettingsDialogComponent,
  PreSolveGlobalSettingsComponent,
  PreSolveMessageComponent,
  PreSolveShipmentModelSettingsComponent,
  RegenerateConfirmationDialogComponent,
  RoutesChartControlBarComponent,
  ShipmentsControlBarComponent,
  ShipmentsKpisComponent,
  StorageApiSaveLoadDialogComponent,
  CsvUploadDialogComponent,
  UploadDialogComponent,
  ValidationResultDialogComponent,
  VehicleInfoWindowComponent,
  VehiclesControlBarComponent,
  VehiclesKpisComponent,
  VehicleOperatorsKpisComponent,
  VisitRequestInfoWindowComponent,
} from './containers';
import { DownloadPdfDialogComponent } from './containers/download-pdf-dialog/download-pdf-dialog.component';
import { PdfMapComponent } from './containers/pdf-map/pdf-map.component';
import { ConfirmBulkEditDialogComponent } from './components/confirm-bulk-edit-dialog/confirm-bulk-edit-dialog.component';
import { VehicleOperatorsControlBarComponent } from './containers/vehicle-operators-control-bar/vehicle-operators-control-bar.component';
import { BaseEditVehicleOperatorDialogComponent } from './components/base-edit-vehicle-operator-dialog/base-edit-vehicle-operator-dialog.component';
import { PreSolveEditVehicleOperatorDialogComponent } from './containers/pre-solve-edit-vehicle-operator-dialog/pre-solve-edit-vehicle-operator-dialog.component';
import { CsvHelpDialogComponent } from './containers/csv-help-dialog/csv-help-dialog.component';
import { TopBarComponent } from './components/top-bar/top-bar.component';
import { DatasetComponent } from './components/dataset/dataset.component';

export const COMPONENTS = [
  BaseDocumentationDialogComponent,
  BaseEditShipmentDialogComponent,
  BaseEditVehicleDialogComponent,
  BaseEditVisitDialogComponent,
  BaseGenerateButtonComponent,
  BasePostSolveMessageComponent,
  BasePreSolveMessageComponent,
  BaseShipmentsKpisComponent,
  BaseStorageApiSaveLoadDialogComponent,
  BaseMainNavComponent,
  BasePostSolveMetricsComponent,
  BaseRegenerateConfirmationDialogComponent,
  BaseValidationResultDialogComponent,
  BaseVehicleInfoWindowComponent,
  BaseVehiclesKpisComponent,
  BaseVehicleOperatorsKpisComponent,
  BaseVisitRequestInfoWindowComponent,
  BodyComponent,
  HideMapButtonComponent,
  LogoComponent,
  MapToggleButtonComponent,
  MapTypeButtonComponent,
  MessageSnackBarComponent,
  PostSolveTimelineLegendComponent,
  ProgressBarComponent,
  SelectMapItemsButtonComponent,
  SharedDefsComponent,
  SideBarComponent,
  TimeNavigationComponent,
  ToggleSelectionFilterButtonComponent,
  ZoomHomeButtonComponent,
];

export const CONTAINERS = [
  AppComponent,
  DocumentationDialogComponent,
  EditGlobalRelaxationConstraintsDialogComponent,
  EditVisitDialogComponent,
  FormMapComponent,
  GenerateButtonComponent,
  MainActionsComponent,
  MainNavComponent,
  MapComponent,
  MapWrapperComponent,
  MetadataControlBarComponent,
  PostSolveControlBarComponent,
  PostSolveMessageComponent,
  PostSolveMetricsComponent,
  PreSolveControlBarComponent,
  PreSolveEditShipmentDialogComponent,
  PreSolveEditVehicleDialogComponent,
  PreSolveGlobalSettingsComponent,
  PreSolveMessageComponent,
  PreSolveSettingsDialogComponent,
  PreSolveShipmentModelSettingsComponent,
  RegenerateConfirmationDialogComponent,
  RoutesChartControlBarComponent,
  ShipmentsControlBarComponent,
  ShipmentsKpisComponent,
  StorageApiSaveLoadDialogComponent,
  UploadDialogComponent,
  ValidationResultDialogComponent,
  VehicleInfoWindowComponent,
  VehiclesControlBarComponent,
  VehiclesKpisComponent,
  VehicleOperatorsKpisComponent,
  VisitRequestInfoWindowComponent,
];

@NgModule({
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    RouterModule,
    ReactiveFormsModule,
    MaterialModule,
    SharedModule,
  ],
  declarations: [
    COMPONENTS,
    CONTAINERS,
    CsvUploadDialogComponent,
    DownloadPdfDialogComponent,
    PdfMapComponent,
    ConfirmBulkEditDialogComponent,
    VehicleOperatorsControlBarComponent,
    PreSolveEditVehicleOperatorDialogComponent,
    BaseEditVehicleOperatorDialogComponent,
    CsvHelpDialogComponent,
    TopBarComponent,
    DatasetComponent,
  ],
  exports: [COMPONENTS, CONTAINERS, CsvUploadDialogComponent],
})
export class CoreModule {}
