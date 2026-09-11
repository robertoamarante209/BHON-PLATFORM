type PreloadEventTarget = Pick<EventTarget, 'addEventListener'>;

export const installChunkRecovery = (
  target: PreloadEventTarget = window,
  reload: () => void = () => window.location.reload(),
) => {
  target.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    reload();
  });
};
