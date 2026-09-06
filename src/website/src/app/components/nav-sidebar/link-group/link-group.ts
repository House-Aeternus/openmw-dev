import { Component, ElementRef, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Link {
  Text: string;
  Url: string;
}

@Component({
  imports: [RouterLink],
  selector: 'app-link-group',
  styleUrl: './link-group.css',
  templateUrl: './link-group.html',
})
export class LinkGroup {
  private readonly ElementRef = inject(ElementRef);
  public Text = input.required<string>();
  public Url = input<string | undefined>(undefined);
  public Icon = input.required<string>();
  public Links = input<Link[]>([]);
  public SubmenuOpening = signal<boolean>(false);
  public SubmenuClosing = signal<boolean>(false);
  public SubmenuIsOpen = signal<boolean>(false);

  public IsActive(link: Link): boolean {
    return window.location.pathname === link.Url;
  }

  /**
   * Toggles the link submenu open or closed. If it is currently closed, then it gets
   * measured off-screen then opened.
   */
  public async ToggleSubMenu(): Promise<void> {
    // Do nothing if it's currently animating
    if (this.SubmenuOpening() || this.SubmenuClosing()) {
      return;
    }

    if (!this.SubmenuIsOpen()) {
      const submenu = this.ElementRef.nativeElement.querySelector("ul");
      submenu.style.display = "block";
      submenu.style.height = "auto";
      submenu.style.position = "absolute";
      submenu.style.left = "-9999px";
      await new Promise<void>(resolve => {
        setTimeout(() => {
          const clientRects = submenu.getClientRects();
          submenu.style.setProperty("--full-height", `${clientRects[0].height}px`);
          submenu.style.display = null;
          submenu.style.position = null;
          submenu.style.left = null;
          resolve();
        }, 10);
      });
      this.SubmenuOpening.set(true);
    } else {
      this.SubmenuClosing.set(true);
    }
  }

  public OnSubmenuAnimationEnd(e: AnimationEvent): void {
    if (e.animationName.endsWith("close-sub-menu")){
      this.SubmenuClosing.set(false);
      this.SubmenuIsOpen.set(false);
    } else if (e.animationName.endsWith("open-sub-menu")){
      this.SubmenuOpening.set(false);
      this.SubmenuIsOpen.set(true);
    }
  }
}
