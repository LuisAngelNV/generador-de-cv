import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { Home } from './home';

describe('Home', () => {
  const isAuthenticated = signal(false);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { isAuthenticated } }],
    });
  });

  async function render() {
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('invites anonymous users to register or log in', async () => {
    isAuthenticated.set(false);
    const links = [...(await render()).querySelectorAll('a')].map((a) => a.getAttribute('href'));

    expect(links).toEqual(['/register', '/login']);
  });

  it('links signed-in users to their CVs', async () => {
    isAuthenticated.set(true);
    const links = [...(await render()).querySelectorAll('a')].map((a) => a.getAttribute('href'));

    expect(links).toEqual(['/cvs']);
  });
});
