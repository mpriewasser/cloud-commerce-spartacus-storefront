import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { cold, hot } from 'jasmine-marbles';
import { Observable, of } from 'rxjs';
import { OccConfig } from '../../../occ/index';
import { CartEntryConnector } from '../../connectors/entry/cart-entry.connector';
import * as fromActions from '../actions';
import * as fromEffects from './cart-entry.effect';

import createSpy = jasmine.createSpy;

const MockOccModuleConfig: OccConfig = {
  backend: {
    occ: {
      baseUrl: '',
      prefix: '',
    },
  },
};

class MockCartEntryConnector {
  add = createSpy().and.returnValue(of({ entry: 'testEntry' }));
  remove = createSpy().and.returnValue(of({}));
  update = createSpy().and.returnValue(of({}));
}

describe('Cart effect', () => {
  let entryEffects: fromEffects.CartEntryEffects;
  let actions$: Observable<any>;

  const userId = 'testUserId';
  const cartId = 'testCartId';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: CartEntryConnector, useClass: MockCartEntryConnector },
        fromEffects.CartEntryEffects,
        { provide: OccConfig, useValue: MockOccModuleConfig },
        provideMockActions(() => actions$),
      ],
    });

    entryEffects = TestBed.get(fromEffects.CartEntryEffects);
  });

  describe('addEntry$', () => {
    it('should add an entry', () => {
      const action = new fromActions.AddEntry({
        userId: userId,
        cartId: cartId,
        productCode: 'testProductCode',
        quantity: 1,
      });
      const completion = new fromActions.AddEntrySuccess({
        entry: 'testEntry',
        userId,
        cartId,
      });

      actions$ = hot('-a', { a: action });
      const expected = cold('-b', { b: completion });

      expect(entryEffects.addEntry$).toBeObservable(expected);
    });
  });

  describe('removeEntry$', () => {
    it('should remove an entry', () => {
      const action = new fromActions.RemoveEntry({
        userId: userId,
        cartId: cartId,
        entry: 'testEntryNumber',
      });
      const completion = new fromActions.RemoveEntrySuccess({ userId, cartId });

      actions$ = hot('-a', { a: action });
      const expected = cold('-b', { b: completion });

      expect(entryEffects.removeEntry$).toBeObservable(expected);
    });
  });

  describe('updateEntry$', () => {
    it('should update an entry', () => {
      const action = new fromActions.UpdateEntry({
        userId: userId,
        cartId: cartId,
        entry: 'testEntryNumber',
        qty: 1,
      });
      const completion = new fromActions.UpdateEntrySuccess({ userId, cartId });

      actions$ = hot('-a', { a: action });
      const expected = cold('-b', { b: completion });

      expect(entryEffects.updateEntry$).toBeObservable(expected);
    });
  });
});
