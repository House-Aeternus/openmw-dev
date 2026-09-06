import { Component, input } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-alert-box',
  styleUrl: './alert-box.css',
  templateUrl: './alert-box.html',
})
export class AlertBox {
  public Title = input.required<string>();
}
