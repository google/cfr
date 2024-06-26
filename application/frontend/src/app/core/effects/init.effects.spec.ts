/*
Copyright 2024 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Observable } from 'rxjs';
import * as fromConfig from '../selectors/config.selectors';
import { InitEffects } from './init.effects';

describe('InitEffects', () => {
  let actions$: Observable<any>;
  let effects: InitEffects;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        InitEffects,
        provideMockStore({
          selectors: [{ selector: fromConfig.selectMapConfig, value: null }],
        }),
        provideMockActions(() => actions$),
      ],
    });

    actions$ = TestBed.inject(Actions);
    effects = TestBed.inject<InitEffects>(InitEffects);
  });

  it('should be created', () => {
    expect(effects).toBeTruthy();
  });
});
