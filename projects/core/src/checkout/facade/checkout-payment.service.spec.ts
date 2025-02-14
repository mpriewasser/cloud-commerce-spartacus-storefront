import { inject, TestBed } from '@angular/core/testing';
import { Store, StoreModule } from '@ngrx/store';
import { CartDataService } from '../../cart/facade/cart-data.service';
import { CardType, Cart, PaymentDetails } from '../../model/cart.model';
import * as fromCheckout from '../store/index';
import { CheckoutPaymentService } from './checkout-payment.service';

describe('CheckoutPaymentService', () => {
  let service: CheckoutPaymentService;
  let cartData: CartDataServiceStub;
  let store: Store<fromCheckout.CheckoutState>;
  const userId = 'testUserId';
  const cart: Cart = { code: 'testCartId', guid: 'testGuid' };

  const paymentDetails: PaymentDetails = {
    id: 'mockPaymentDetails',
  };

  class CartDataServiceStub {
    userId;
    cart;
    get cartId() {
      return this.cart.code;
    }
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        StoreModule.forRoot({}),
        StoreModule.forFeature('checkout', fromCheckout.getReducers()),
      ],
      providers: [
        CheckoutPaymentService,
        { provide: CartDataService, useClass: CartDataServiceStub },
      ],
    });

    service = TestBed.get(CheckoutPaymentService);
    cartData = TestBed.get(CartDataService);
    store = TestBed.get(Store);

    cartData.userId = userId;
    cartData.cart = cart;

    spyOn(store, 'dispatch').and.callThrough();
  });

  it('should CheckoutPaymentService is injected', inject(
    [CheckoutPaymentService],
    (checkoutService: CheckoutPaymentService) => {
      expect(checkoutService).toBeTruthy();
    }
  ));

  it('should be able to get the card types', () => {
    store.dispatch(
      new fromCheckout.LoadCardTypesSuccess([
        { code: 'visa', name: 'visa' },
        { code: 'masterCard', name: 'masterCard' },
      ])
    );

    let cardTypes: CardType[];
    service.getCardTypes().subscribe(data => {
      cardTypes = data;
    });
    expect(cardTypes).toEqual([
      { code: 'visa', name: 'visa' },
      { code: 'masterCard', name: 'masterCard' },
    ]);
  });

  it('should be able to get the payment details', () => {
    store.dispatch(new fromCheckout.SetPaymentDetailsSuccess(paymentDetails));

    let tempPaymentDetails: PaymentDetails;
    service
      .getPaymentDetails()
      .subscribe(data => {
        tempPaymentDetails = data;
      })
      .unsubscribe();
    expect(tempPaymentDetails).toEqual(paymentDetails);
  });

  it('should be able to load supported cart types', () => {
    service.loadSupportedCardTypes();
    expect(store.dispatch).toHaveBeenCalledWith(
      new fromCheckout.LoadCardTypes()
    );
  });

  it('should be able to create payment details', () => {
    service.createPaymentDetails(paymentDetails);

    expect(store.dispatch).toHaveBeenCalledWith(
      new fromCheckout.CreatePaymentDetails({
        userId: userId,
        cartId: cart.code,
        paymentDetails,
      })
    );
  });

  it('should set payment details', () => {
    service.setPaymentDetails(paymentDetails);

    expect(store.dispatch).toHaveBeenCalledWith(
      new fromCheckout.SetPaymentDetails({
        userId: userId,
        cartId: cartData.cart.code,
        paymentDetails,
      })
    );
  });
});
