import { Component, HostListener, input } from '@angular/core';
import { docs } from '../../generated/docs.generated';

@Component({
  selector: 'app-docs-page',
  templateUrl: './docs-page.html',
  styleUrl: './docs-page.css',
})
export class DocsPage {
  readonly slug = input('');

  protected document() {
    return docs.find((document) => document.slug === (this.slug() ?? ''));
  }

  @HostListener('click', ['$event'])
  protected onClick(event: MouseEvent): void {
    const copy = event.target instanceof Element ? event.target.closest<HTMLElement>('.doc-code-copy') : null;
    if (copy) {
      void this.copyCode(copy);
      return;
    }
    const button = event.target instanceof Element ? event.target.closest<HTMLElement>('.doc-code-tabs__tab') : null;
    const tabs = button?.closest<HTMLElement>('.doc-code-tabs');
    if (!button || !tabs) return;
    event.preventDefault();
    const buttons = [...tabs.querySelectorAll<HTMLElement>('[role="tab"]')];
    this.selectTab(tabs, buttons.indexOf(button));
  }

  @HostListener('keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    const copy = event.target instanceof Element ? event.target.closest<HTMLElement>('.doc-code-copy') : null;
    if (copy && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      void this.copyCode(copy);
      return;
    }
    const button = event.target instanceof Element ? event.target.closest<HTMLElement>('.doc-code-tabs__tab') : null;
    const tabs = button?.closest<HTMLElement>('.doc-code-tabs');
    if (!button || !tabs || !['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    const buttons = [...tabs.querySelectorAll<HTMLElement>('[role="tab"]')];
    const index = buttons.indexOf(button);
    const selected = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    event.preventDefault();
    this.selectTab(tabs, selected);
    buttons[selected].focus();
  }

  private selectTab(tabs: HTMLElement, selected: number): void {
    const buttons = [...tabs.querySelectorAll<HTMLElement>('[role="tab"]')];
    const panels = [...tabs.querySelectorAll<HTMLElement>('[role="tabpanel"]')];
    buttons.forEach((tab, index) => {
      const active = index === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[index].hidden = !active;
    });
  }

  private async copyCode(control: HTMLElement): Promise<void> {
    const container = control.closest<HTMLElement>('.doc-code-tabs, .doc-code-frame');
    const panel = container?.querySelector<HTMLElement>('[role="tabpanel"]:not([hidden])') ?? container;
    const code = [...(panel?.querySelectorAll<HTMLElement>('.doc-code-line__content') ?? [])].map((line) => line.textContent ?? '').join('\n');
    if (!code) return;
    await navigator.clipboard.writeText(code);
    control.textContent = 'Copied';
    window.setTimeout(() => control.textContent = 'Copy', 1600);
  }
}
