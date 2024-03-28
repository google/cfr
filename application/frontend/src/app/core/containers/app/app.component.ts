/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { select, Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import * as fromRoot from 'src/app/reducers';
import { UIActions } from '../../actions';
import { Page } from '../../models';
import DispatcherApiSelectors from '../../selectors/dispatcher-api.selectors';
import * as fromUI from '../../selectors/ui.selectors';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly hasMap$: Observable<boolean>;
  readonly loading$: Observable<boolean>;
  readonly started$: Observable<boolean>;
  readonly splitSizes$: Observable<number[]>;
  readonly page$: Observable<Page>;

  constructor(
    domSanitizer: DomSanitizer,
    matIconRegistry: MatIconRegistry,
    private store: Store<fromRoot.State>
  ) {
    const icons = [
      'access_time',
      'add',
      'add_color',
      'add_vehicle',
      'arrow_back',
      'arrow_downward',
      'arrow_drop_down',
      'arrow_upward',
      'bookmark',
      'calendar',
      'check',
      'clear',
      'clock',
      'cloud_download',
      'cloud_upload',
      'csv',
      'csv2',
      'dataset',
      'delete',
      'depot_outline',
      'dropoff',
      'edit',
      'help',
      'help-filled',
      'input',
      'json',
      'map',
      'maps',
      'more_vert',
      'navigate_before',
      'navigate_next',
      'pdf',
      'pickup',
      'satellite',
      'save_alt',
      'settings',
      'toc_rtl',
      'trending_up',
      'update',
      'upload',
      'visibility',
      'visibility_off',
      'visit',
      'vehicles_nav',
      'shipments_nav',
      'select_bbox',
      'select_bbox_active',
      'select_polygon',
      'select_polygon_active',
      'zip',
    ];
    icons.forEach((icon) =>
      matIconRegistry.addSvgIcon(
        icon,
        domSanitizer.bypassSecurityTrustResourceUrl(`./assets/images/${icon}.svg`)
      )
    );
    this.started$ = store.pipe(select(fromUI.selectStarted));
    this.hasMap$ = store.pipe(select(fromUI.selectHasMap));
    this.loading$ = store.pipe(select(DispatcherApiSelectors.selectOptimizeToursLoading));
    this.splitSizes$ = store.pipe(select(fromUI.selectSplitSizes));
    this.page$ = store.pipe(select(fromUI.selectPage));
  }

  onSplitSizesChange(splitSizes: number[]): void {
    this.store.dispatch(UIActions.changeSplitSizes({ splitSizes }));
  }
}
