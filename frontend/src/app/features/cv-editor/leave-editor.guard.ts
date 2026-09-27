import { CanDeactivateFn } from '@angular/router';

export interface LeaveGuarded {
  canLeave(): boolean;
}

/** Asks before leaving a page with changes that could not be saved. */
export const leaveEditorGuard: CanDeactivateFn<LeaveGuarded> = (component) =>
  component.canLeave() ||
  window.confirm('Hay cambios que no se han podido guardar. ¿Quieres salir igualmente?');
