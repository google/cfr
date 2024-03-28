import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { selectScenarioName } from '../../selectors/dispatcher.selectors';
import { saveScenarioName } from '../../actions/dispatcher.actions';

@Component({
  selector: 'app-dataset',
  templateUrl: './dataset.component.html',
  styleUrls: ['./dataset.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetComponent implements AfterViewInit {
  @ViewChild('scenarioInput') scenarioInput: ElementRef;
  @ViewChild('resizeText') resizeText: ElementRef;

  scenarioName = '';
  originalScenarioName = '';

  constructor(private store: Store, private detectRef: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    this.store.select(selectScenarioName).subscribe((value) => {
      this.scenarioName = value;
      this.originalScenarioName = value;
      this.updateInputSize();
      this.detectRef.markForCheck();
    });
  }

  updateInputSize(): void {
    this.resizeText.nativeElement.textContent = this.scenarioName;
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.scenarioInput.nativeElement.blur();
      this.save();
    } else if (event.key === 'Escape') {
      this.reset();
      this.updateInputSize();
      this.scenarioInput.nativeElement.blur();
    }
  }

  reset(): void {
    this.scenarioName = this.originalScenarioName;
  }

  save(): void {
    this.store.dispatch(saveScenarioName({ scenarioName: this.scenarioName }));
  }
}
