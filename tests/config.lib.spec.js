/* eslint-disable no-underscore-dangle */
const rewire = require('rewire');

const forgeConfigLib = rewire('../src/cli/node/config/lib');
// const { initialSupplyValidator, getNumberValidator } = require('../src/cli/node/config/lib');

const DAYS_OF_YEAR = forgeConfigLib.__get__('DAYS_OF_YEAR');

describe('config.lib.chainNameValidateFunc', () => {
  const getNumberValidator = forgeConfigLib.__get__('getNumberValidator')('test');
  test('chain name should not be a number', async () => {
    const expected = /test.*should.*a.*number/i;
    expect(getNumberValidator()).toEqual(expect.stringMatching(expected));
    expect(getNumberValidator(' ')).toEqual(expect.stringMatching(expected));
    expect(getNumberValidator(null)).toEqual(expect.stringMatching(expected));
    expect(getNumberValidator('arcblock')).toEqual(expect.stringMatching(expected));
    expect(getNumberValidator(1)).toBeTruthy();
  });

  test('chain name should not be a positive number', async () => {
    const expected = /test.*positive.*number/i;
    expect(getNumberValidator(-0.1)).toEqual(expect.stringMatching(expected));
    expect(getNumberValidator(1)).toEqual(true);
  });
});

describe('config.lib.initialSupplyValidator', () => {
  const initialSupplyValidator = forgeConfigLib.__get__('initialSupplyValidator');
  test('initial supply should less or equal than total supply', () => {
    const expected = /initial supply should less or equal than total supply/i;
    expect(initialSupplyValidator(101, { tokenTotalSupply: 100 })).toEqual(
      expect.stringMatching(expected)
    );
    expect(initialSupplyValidator(99, { tokenTotalSupply: 100 })).toEqual(true);
    expect(initialSupplyValidator(100, { tokenTotalSupply: 100 })).toEqual(true);
  });
});

describe('config.lib.pokeAmountValidator', () => {
  const pokeAmountValidator = forgeConfigLib.__get__('pokeAmountValidator');
  it(`poke should less than initial supply ${DAYS_OF_YEAR} / 4`, () => {
    expect(pokeAmountValidator(100, { tokenInitialSupply: 4 * DAYS_OF_YEAR * 100 })).toEqual(true);
    expect(pokeAmountValidator(101, { tokenInitialSupply: 4 * DAYS_OF_YEAR * 100 })).toEqual(
      expect.stringMatching(/Poke amount is too big/i)
    );
  });
});

describe('config.lib.dailyLimitValidator', () => {
  const dailyLimitValidator = forgeConfigLib.__get__('dailyLimitValidator');
  it('daily poke limit should greater than poke amount', () => {
    expect(dailyLimitValidator(99, { pokeAmount: 100 })).toEqual(
      expect.stringMatching(/daily poke limit should greater/i)
    );
    expect(
      dailyLimitValidator(101, { pokeAmount: 100, tokenInitialSupply: 100 * DAYS_OF_YEAR * 4 })
    ).toEqual(true);
    expect(
      dailyLimitValidator(100, { pokeAmount: 100, tokenInitialSupply: 100 * DAYS_OF_YEAR * 4 })
    ).toEqual(true);
  });

  it(`daily poke limit should less than initial supply / ${DAYS_OF_YEAR} / 4`, () => {
    expect(
      dailyLimitValidator(100, { pokeAmount: 100, tokenInitialSupply: 100 * DAYS_OF_YEAR * 4 })
    ).toEqual(true);
    expect(
      dailyLimitValidator(101, { pokeAmount: 100, tokenInitialSupply: 100 * DAYS_OF_YEAR * 4 })
    ).toEqual(expect.stringMatching(/Daily poke limit is too big/i));
  });
});

describe('config.lib.pokeBalanceValidator', () => {
  const pokeBalanceValidator = forgeConfigLib.__get__('pokeBalanceValidator');
  it('poke balance should less than initial supply', () => {
    expect(pokeBalanceValidator(101, { initialSupply: 100 })).toEqual(
      expect.stringMatching(/Poke balance is too big/i)
    );
  });

  it(`poke balance should bigger than daily limit * ${DAYS_OF_YEAR} * 4`, () => {
    expect(
      pokeBalanceValidator(99 * DAYS_OF_YEAR * 4, {
        pokeDailyLimit: 100,
        initialSupply: 100 * DAYS_OF_YEAR * 4,
      })
    ).toEqual(expect.stringMatching(/Poke balance is too small/i));

    expect(
      pokeBalanceValidator(100 * DAYS_OF_YEAR * 4, {
        pokeDailyLimit: 100,
        initialSupply: 100 * DAYS_OF_YEAR * 4,
      })
    ).toEqual(true);
  });
});
