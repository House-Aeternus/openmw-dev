import { Component } from '@angular/core';
import { SearchBar } from "../search-bar/search-bar";

@Component({
  imports: [SearchBar],
  selector: 'app-topbar',
  styleUrl: './topbar.css',
  templateUrl: './topbar.html',
})
export class Topbar {}
