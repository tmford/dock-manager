import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DockManager } from './dock-manager';

describe('DockManager', () => {
  let component: DockManager;
  let fixture: ComponentFixture<DockManager>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DockManager],
      providers: [provideZonelessChangeDetection()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DockManager);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
