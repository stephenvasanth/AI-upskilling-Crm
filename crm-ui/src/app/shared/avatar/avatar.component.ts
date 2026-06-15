import { Component, computed, input } from '@angular/core';

/** Avatar sizes, in pixels (docs/DESIGN.md §6.4): inline, table row, card, detail page. */
export type AvatarSize = 24 | 32 | 48 | 80;

/** 10 preset avatar background colours (docs/DESIGN.md §6.4), chosen deterministically from the person's name. */
const AVATAR_COLORS: readonly string[] = [
  '#F87171',
  '#FB923C',
  '#FBBF24',
  '#A3E635',
  '#34D399',
  '#22D3EE',
  '#60A5FA',
  '#A78BFA',
  '#F472B6',
  '#94A3B8',
];

/**
 * Circular avatar showing a person's initials on a colour deterministically
 * derived from their name (docs/DESIGN.md §6.4). Used wherever a contact,
 * owner, or user is represented by name.
 */
@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [],
  templateUrl: './avatar.component.html',
  styleUrl: './avatar.component.scss',
})
export class AvatarComponent {
  /** The person's first name. */
  readonly firstName = input.required<string>();

  /** The person's last name. */
  readonly lastName = input.required<string>();

  /** Avatar diameter in pixels. Defaults to 32 (table row). */
  readonly size = input<AvatarSize>(32);

  /** Upper-case first-letter-of-first-name + first-letter-of-last-name. */
  readonly initials = computed(() => {
    const first = this.firstName().charAt(0);
    const last = this.lastName().charAt(0);
    return `${first}${last}`.toUpperCase();
  });

  /** Background colour from `AVATAR_COLORS`, chosen by hashing the full name. */
  readonly backgroundColor = computed(() => {
    const name = `${this.firstName()} ${this.lastName()}`;
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
      hash |= 0;
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  });

  /** Initials font size, scaled proportionally to `size`. */
  readonly fontSize = computed(() => Math.round(this.size() * 0.4));
}
