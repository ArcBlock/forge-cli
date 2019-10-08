/* eslint-disable no-underscore-dangle */

const pickBy = require('lodash/pickBy');
const rewire = require('rewire');

const globalConfigLib = rewire('../src/core/libs/global-config');

const getDefaultGlobalConfig = globalConfigLib.__get__('getDefaultGlobalConfig');
const getConfig = globalConfigLib.__get__('getConfig');

describe('core.libs.global-config', () => {
  describe('getConfig', () => {
    test('should use default if global config is empty', () => {
      const defaultConfigs = getDefaultGlobalConfig();
      expect(pickBy(defaultConfigs, v => v !== undefined)).toEqual(
        getConfig(undefined, defaultConfigs)
      );
    });

    test('should use custom config if set', () => {
      const defaultConfigs = getDefaultGlobalConfig();
      const mirror = 'http://demo.com';

      expect(getConfig({ mirror }, defaultConfigs).mirror).toEqual(mirror);
    });

    test('should not allow configs that not in whitelist', () => {
      const defaultConfigs = getDefaultGlobalConfig();
      const unSupportConfigX = 'http://demo.com';
      const configs = getConfig({ unSupportConfigX }, defaultConfigs);

      expect(unSupportConfigX in configs).toBeFalsy();
    });
  });
});
