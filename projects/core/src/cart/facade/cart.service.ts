import { Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { asyncScheduler, combineLatest, Observable } from 'rxjs';
import {
  debounceTime,
  filter,
  map,
  shareReplay,
  take,
  tap,
} from 'rxjs/operators';
import { AuthService } from '../../auth/index';
import { Cart } from '../../model/cart.model';
import { OrderEntry } from '../../model/order.model';
import * as fromAction from '../store/actions';
import { StateWithCart } from '../store/cart-state';
import * as fromSelector from '../store/selectors';
import { ANONYMOUS_USERID, CartDataService } from './cart-data.service';

@Injectable()
export class CartService {
  private readonly PREVIOUS_USER_ID_INITIAL_VALUE =
    'PREVIOUS_USER_ID_INITIAL_VALUE';
  private previousUserId = this.PREVIOUS_USER_ID_INITIAL_VALUE;
  private _activeCart$: Observable<Cart>;

  constructor(
    protected store: Store<StateWithCart>,
    protected cartData: CartDataService,
    protected authService: AuthService
  ) {
    this._activeCart$ = combineLatest([
      this.store.select(fromSelector.getCartContent),
      this.store.select(fromSelector.getCartLoading),
      this.authService.getUserToken(),
    ]).pipe(
      // combineLatest emits multiple times on each property update instead of one emit
      // additionally dispatching actions that changes selectors used here needs to happen in order
      // for this asyncScheduler is used here
      debounceTime(1, asyncScheduler),
      filter(([, loading]) => !loading),
      tap(([cart, , userToken]) => {
        if (this.isJustLoggedIn(userToken.userId)) {
          this.loadOrMerge();
        } else if (this.isCreated(cart) && this.isIncomplete(cart)) {
          this.load();
        }

        this.previousUserId = userToken.userId;
      }),
      filter(
        ([cart]) =>
          !this.isCreated(cart) ||
          (this.isCreated(cart) && !this.isIncomplete(cart))
      ),
      map(([cart]) => cart),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  getActive(): Observable<Cart> {
    return this._activeCart$;
  }

  getEntries(): Observable<OrderEntry[]> {
    return this.store.pipe(select(fromSelector.getCartEntries));
  }

  getCartMergeComplete(): Observable<boolean> {
    return this.store.pipe(select(fromSelector.getCartMergeComplete));
  }

  getLoaded(): Observable<boolean> {
    return this.store.pipe(select(fromSelector.getCartLoaded));
  }

  private loadOrMerge(): void {
    // for login user, whenever there's an existing cart, we will load the user
    // current cart and merge it into the existing cart
    if (!this.isCreated(this.cartData.cart)) {
      this.store.dispatch(
        new fromAction.LoadCart({
          userId: this.cartData.userId,
          cartId: 'current',
        })
      );
    } else {
      this.store.dispatch(
        new fromAction.MergeCart({
          userId: this.cartData.userId,
          cartId: this.cartData.cart.guid,
        })
      );
    }
  }

  private load(): void {
    if (this.cartData.userId !== ANONYMOUS_USERID) {
      this.store.dispatch(
        new fromAction.LoadCart({
          userId: this.cartData.userId,
          cartId: this.cartData.cartId ? this.cartData.cartId : 'current',
        })
      );
    } else {
      this.store.dispatch(
        new fromAction.LoadCart({
          userId: this.cartData.userId,
          cartId: this.cartData.cartId,
        })
      );
    }
  }

  addEntry(productCode: string, quantity: number): void {
    this.store
      .pipe(
        select(fromSelector.getActiveCartState),
        tap(cartState => {
          if (!this.isCreated(cartState.value.content) && !cartState.loading) {
            this.store.dispatch(
              new fromAction.CreateCart({ userId: this.cartData.userId })
            );
          }
        }),
        filter(cartState => this.isCreated(cartState.value.content)),
        take(1)
      )
      .subscribe(_ => {
        this.store.dispatch(
          new fromAction.AddEntry({
            userId: this.cartData.userId,
            cartId: this.cartData.cartId,
            productCode: productCode,
            quantity: quantity,
          })
        );
      });
  }

  removeEntry(entry: OrderEntry): void {
    this.store.dispatch(
      new fromAction.RemoveEntry({
        userId: this.cartData.userId,
        cartId: this.cartData.cartId,
        entry: entry.entryNumber,
      })
    );
  }

  updateEntry(entryNumber: string, quantity: number): void {
    if (quantity > 0) {
      this.store.dispatch(
        new fromAction.UpdateEntry({
          userId: this.cartData.userId,
          cartId: this.cartData.cartId,
          entry: entryNumber,
          qty: quantity,
        })
      );
    } else {
      this.store.dispatch(
        new fromAction.RemoveEntry({
          userId: this.cartData.userId,
          cartId: this.cartData.cartId,
          entry: entryNumber,
        })
      );
    }
  }

  getEntry(productCode: string): Observable<OrderEntry> {
    return this.store.pipe(
      select(fromSelector.getCartEntrySelectorFactory(productCode))
    );
  }

  private isCreated(cart: Cart): boolean {
    return cart && typeof cart.guid !== 'undefined';
  }

  /**
   * Cart is incomplete if it contains only `guid` and `code` properties, which come from local storage.
   * To get cart content, we need to load cart from backend.
   */
  private isIncomplete(cart: Cart): boolean {
    return cart && Object.keys(cart).length <= 2;
  }

  private isJustLoggedIn(userId: string): boolean {
    return (
      typeof userId !== 'undefined' && // logged in user
      this.previousUserId !== userId && // *just* logged in
      this.previousUserId !== this.PREVIOUS_USER_ID_INITIAL_VALUE // not app initialization
    );
  }
}
