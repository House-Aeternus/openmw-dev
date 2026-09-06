import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavSidebar } from './nav-sidebar';

describe('NavSidebar', () => {
  let component: NavSidebar;
  let fixture: ComponentFixture<NavSidebar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavSidebar],
    }).compileComponents();

    fixture = TestBed.createComponent(NavSidebar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
