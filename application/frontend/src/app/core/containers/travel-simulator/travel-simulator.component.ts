import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-travel-simulator',
  templateUrl: './travel-simulator.component.html',
  styleUrls: ['./travel-simulator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TravelSimulatorComponent {}
