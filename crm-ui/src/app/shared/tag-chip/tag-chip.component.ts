import { Component, input } from '@angular/core';

import { TagResponse } from '../../core/models/tag.model';

/**
 * Coloured pill showing a tag's name on its custom background colour
 * (docs/DESIGN.md §6.3).
 */
@Component({
  selector: 'app-tag-chip',
  standalone: true,
  imports: [],
  templateUrl: './tag-chip.component.html',
  styleUrl: './tag-chip.component.scss',
})
export class TagChipComponent {
  /** The tag to display. */
  readonly tag = input.required<TagResponse>();
}
