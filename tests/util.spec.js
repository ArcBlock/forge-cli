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

  describe('#promiseRetry', () => {
    test('should retry specified times if always failed', done => {
      const mockFunc = jest.fn(async () => {
        throw new Error('test');
      });

      util
        .promiseRetry(mockFunc, 3)()
        .finally(() => {
          expect(mockFunc.mock.calls.length).toBe(3 + 1); // first execute add retry times
          done();
        });
    });

    test('should not retry if always succeed', done => {
      const mockFunc = jest.fn(async () => {});

      util
        .promiseRetry(mockFunc, 3)()
        .finally(() => {
          expect(mockFunc.mock.calls.length).toBe(1); // first execute add retry times
          done();
        });
    });
  });

  describe('#getForgeDistributionByOS', () => {
    test('should be darwin if platform is darwin', () => {
      expect(util.getForgeDistributionByOS('darwin')).toBe('darwin');
    });

    test('should be centos if platform is linux', () => {
      expect(util.getForgeDistributionByOS('linux')).toBe('centos');
    });

    test('should be passed platform if platform is unsupported', () => {
      expect(util.getForgeDistributionByOS('arcblock')).toBe('arcblock');
    });
  });
});
