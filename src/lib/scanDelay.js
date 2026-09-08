export const RESULT_REVEAL_DELAY_MS = 3000;

export function waitForResultReveal() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, RESULT_REVEAL_DELAY_MS);
  });
}
