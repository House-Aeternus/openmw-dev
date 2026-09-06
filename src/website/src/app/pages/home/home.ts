import { Component } from '@angular/core';
import { Breadcrumbs } from "../../components/breadcrumbs/breadcrumbs";
import { Breadcrumb } from "../../components/breadcrumbs/breadcrumb/breadcrumb";
import { Divider } from "../../components/divider/divider";

@Component({
  imports: [Breadcrumbs, Breadcrumb, Divider],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home {}
