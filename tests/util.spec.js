const util = require('../src/core/util');

describe('#util', () => {
  describe('#parseTimeStrToMS', () => {
    test('should return 10_000 when param is 10ms', async () => {
      expect(util.parseTimeStrToMS('10ms')).toEqual(10);
    });

    test('should return 10_000 when param is 10s', async () => {
      expect(util.parseTimeStrToMS('10s')).toEqual(10 * 1000);
    });

    test('should return 600_000 when param is 10m', async () => {
      expect(util.parseTimeStrToMS('10m')).toEqual(10 * 60 * 1000);
    });

    test('should return 6_000_000 when param is 10h', async () => {
      expect(util.parseTimeStrToMS('10h')).toEqual(10 * 60 * 60 * 1000);
    });
  });
});
