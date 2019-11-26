// const rewire = require('rewire');

const forgeVersion = require('../src/core/forge-version');

describe('core.forge-version', () => {
  describe('gt', () => {
    it('should 0.1.1 great than 0.1.0', () => {
      expect(forgeVersion.gt('0.1.1', '0.1.0')).toBe(true);
    });

    it('should 1.0.1-p0 great than 1.0.1', () => {
      expect(forgeVersion.gt('1.0.1-p0', '1.0.1')).toBe(true);
    });

    it('should 1.0.1-p3 great than 1.0.1-p0', () => {
      expect(forgeVersion.gt('1.0.1-p3', '1.0.1-p0')).toBe(true);
    });

    it('should 1.1.0 great than 1.0.10-p3', () => {
      expect(forgeVersion.gt('1.1.0', '1.0.10-p3')).toBe(true);
    });
  });

  describe('gte', () => {
    it('should 1.0.1 >= 0.1.1', () => {
      expect(forgeVersion.gte('1.0.1', '0.1.1')).toBe(true);
    });

    it('should 1.1.0 >= 1.0.1-p0', () => {
      expect(forgeVersion.gte('1.1.0', '1.0.1-p0')).toBe(true);
    });

    it('should 1.0.1-p0 >= 1.0.1-p0', () => {
      expect(forgeVersion.gte('1.0.1-p0', '1.0.1-p0')).toBe(true);
    });

    it('should 1.0.1-p1 >= 1.0.1-p0', () => {
      expect(forgeVersion.gte('1.0.1-p1', '1.0.1-p0')).toBe(true);
    });

    it('should 1.0.1-p1 >= 1.0.1', () => {
      expect(forgeVersion.gte('1.0.1-p1', '1.0.1')).toBe(true);
    });
  });

  describe('lt', () => {
    it('should 0.1.0 < 0.1.1', () => {
      expect(forgeVersion.lt('0.1.0', '0.1.1')).toBe(true);
    });

    it('should 1.0.1 < 1.0.1-p0', () => {
      expect(forgeVersion.lt('1.0.1', '1.0.1-p0')).toBe(true);
    });

    it('should 1.0.1-p0 < 1.0.1-p3', () => {
      expect(forgeVersion.lt('1.0.1-p0', '1.0.1-p3')).toBe(true);
    });

    it('should 1.0.10-p3 < 1.1.0 ', () => {
      expect(forgeVersion.lt('1.0.10-p3', '1.1.0')).toBe(true);
    });
  });

  describe('lte', () => {
    it('should 0.1.1 <= 1.0.1 ', () => {
      expect(forgeVersion.lte('0.1.1', '1.0.1')).toBe(true);
    });

    it('should 1.0.1-p0 <= 1.1.0', () => {
      expect(forgeVersion.lte('1.0.1-p0', '1.1.0')).toBe(true);
    });

    it('should 1.0.1-p0 <= 1.0.1-p0', () => {
      expect(forgeVersion.lte('1.0.1-p0', '1.0.1-p0')).toBe(true);
    });

    it('should 1.0.1-p0 <= 1.0.1-p1 ', () => {
      expect(forgeVersion.lte('1.0.1-p0', '1.0.1-p1')).toBe(true);
    });

    it('should 1.0.1 <= 1.0.1-p1', () => {
      expect(forgeVersion.lte('1.0.1', '1.0.1-p1')).toBe(true);
    });
  });

  describe('isForgePatchVersion', () => {
    it('1.0.0-p0 is not a forge patch version', () => {
      expect(forgeVersion.isForgePatchVersion('1.0.0-p0')).toBe(true);
    });

    it('1.0.0-p10 is not a forge patch version', () => {
      expect(forgeVersion.isForgePatchVersion('1.0.0-p10')).toBe(true);
    });

    it('1.0.0-p is not a forge patch version', () => {
      expect(forgeVersion.isForgePatchVersion('1.0.0-p')).toBe(false);
    });

    it('1.0.0-alpha1 is not a forge patch version', () => {
      expect(forgeVersion.isForgePatchVersion('1.0.0-alpha1')).toBe(false);
    });

    it('1.0.0 is not a forge patch version', () => {
      expect(forgeVersion.isForgePatchVersion('1.0.0')).toBe(false);
    });
  });
});
