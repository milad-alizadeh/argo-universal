import { phoneStatusControls } from '../../../../../mocks/composer/checkout-stories.test.mocks';
import { createdCheckoutIsReadOnly } from '../../../../../mocks/composer/checkout-stories.test.mocks';
import { meta as composerTestMeta } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { pickers } from '../../../../../mocks/composer/configuration-picker.test.mocks';
import { firstAgent } from '../../../../../mocks/composer/recorded-catalog.test.mocks';
import { secondAgent } from '../../../../../mocks/composer/recorded-catalog.test.mocks';
import { layoutWidths } from '../../../../lib/generic/each-layout';

const meta = { ...composerTestMeta, title: 'Tests/Composer' };

export default meta;

export const PickersPhoneFirstAgent = pickers(layoutWidths.phone, 0);

export const PickersPhoneSecondAgent = pickers(layoutWidths.phone, 1);

export const PickersWideFirstAgent = pickers(layoutWidths.wide, 0);

export const PickersWideSecondAgent = pickers(layoutWidths.wide, 1);

export const CheckoutPhone = phoneStatusControls(firstAgent);

export const CheckoutPhoneSecondAgent = phoneStatusControls(secondAgent);

export const CreatedCheckoutIsReadOnlyPhone = createdCheckoutIsReadOnly(
  layoutWidths.phone,
);

export const CreatedCheckoutIsReadOnlyWide = createdCheckoutIsReadOnly(
  layoutWidths.wide,
);
