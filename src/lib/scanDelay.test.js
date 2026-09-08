import { RESULT_REVEAL_DELAY_MS, waitForResultReveal } from './scanDelay';

describe('waitForResultReveal', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  test('waits exactly 3000ms before revealing a result', async () => {
    const setTimeoutSpy = jest.spyOn(window, 'setTimeout');
    let resolved = false;
    const pending = waitForResultReveal().then(() => {
      resolved = true;
    });

    expect(RESULT_REVEAL_DELAY_MS).toBe(3000);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 3000);

    jest.advanceTimersByTime(2999);
    await Promise.resolve();
    expect(resolved).toBe(false);

    jest.advanceTimersByTime(1);
    await pending;
    expect(resolved).toBe(true);
  });
});
