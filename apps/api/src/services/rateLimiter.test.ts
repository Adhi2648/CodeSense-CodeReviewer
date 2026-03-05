import { checkRateLimit } from "./rateLimiter";
import { redis } from "../lib/redis.js";

type MockMulti = {
  zadd: jest.Mock;
  zremrangebyscore: jest.Mock;
  zcard: jest.Mock;
  pexpire: jest.Mock;
  exec: jest.Mock;
};

const createMockMulti = (): MockMulti => {
  const multi: MockMulti = {
    zadd: jest.fn(),
    zremrangebyscore: jest.fn(),
    zcard: jest.fn(),
    pexpire: jest.fn(),
    exec: jest.fn()
  };

  multi.zadd.mockReturnValue(multi);
  multi.zremrangebyscore.mockReturnValue(multi);
  multi.zcard.mockReturnValue(multi);
  multi.pexpire.mockReturnValue(multi);

  return multi;
};

describe("rateLimiter", () => {
  const originalMulti = redis.multi.bind(redis);
  const originalZrem = redis.zrem.bind(redis);

  afterEach(() => {
    redis.multi = originalMulti;
    redis.zrem = originalZrem;
    jest.clearAllMocks();
  });

  it("allows requests under the hourly threshold", async () => {
    const mockMulti = createMockMulti();
    mockMulti.exec.mockResolvedValue([[null, 1], [null, 0], [null, 4], [null, 1]]);

    redis.multi = jest.fn(() => mockMulti) as unknown as typeof redis.multi;
    redis.zrem = jest.fn() as unknown as typeof redis.zrem;

    const result = await checkRateLimit("user_1");

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(6);
    expect(result.resetAt).toBeInstanceOf(Date);
  });

  it("blocks requests above the hourly threshold", async () => {
    const mockMulti = createMockMulti();
    mockMulti.exec.mockResolvedValue([[null, 1], [null, 0], [null, 11], [null, 1]]);

    redis.multi = jest.fn(() => mockMulti) as unknown as typeof redis.multi;
    redis.zrem = jest.fn() as unknown as typeof redis.zrem;

    const result = await checkRateLimit("user_2");

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(redis.zrem).toHaveBeenCalledTimes(1);
  });
});
