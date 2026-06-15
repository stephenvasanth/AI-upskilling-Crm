import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Application root component. Hosts the router outlet; all visible layout
 * (sidebar, top bar, page content) is provided by routed feature components
 * and the shared layout component built in Group 12.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
