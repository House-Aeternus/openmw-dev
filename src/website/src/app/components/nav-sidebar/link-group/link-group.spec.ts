import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LinkGroup } from './link-group';

describe('LinkGroup', () => {
  let component: LinkGroup;
  let fixture: ComponentFixture<LinkGroup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LinkGroup],
    }).compileComponents();

    fixture = TestBed.createComponent(LinkGroup);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
