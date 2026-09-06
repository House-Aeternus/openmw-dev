import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Topbar } from "./components/topbar/topbar";
import { NavSidebar } from "./components/nav-sidebar/nav-sidebar";

@Component({
  imports: [RouterOutlet, Topbar, NavSidebar],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('website');
}
