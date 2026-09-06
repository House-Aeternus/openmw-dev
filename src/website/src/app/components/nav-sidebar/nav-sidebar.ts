import { Component } from '@angular/core';
import { LinkGroup } from './link-group/link-group';
import { AlertBox } from "../alert-box/alert-box";

@Component({
  imports: [LinkGroup, AlertBox],
  selector: 'app-nav-sidebar',
  styleUrl: './nav-sidebar.css',
  templateUrl: './nav-sidebar.html',
})
export class NavSidebar {}
