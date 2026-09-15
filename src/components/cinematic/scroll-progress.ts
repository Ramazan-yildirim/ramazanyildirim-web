export type ProgressListener = (progress: number) => void;

export type ProgressSource = {
  get: () => number;
  set: (progress: number) => void;
  subscribe: (listener: ProgressListener) => () => void;
};

export function createProgressSource(): ProgressSource {
  let progress = 0;
  const listeners = new Set<ProgressListener>();

  return {
    get: () => progress,
    set: (nextProgress) => {
      progress = Math.min(1, Math.max(0, nextProgress));
      listeners.forEach((listener) => listener(progress));
    },
    subscribe: (listener) => {
      listeners.add(listener);
      listener(progress);

      return () => listeners.delete(listener);
    },
  };
}

export function range(
  progress: number,
  start: number,
  end: number,
) {
  const normalized = Math.min(
    1,
    Math.max(0, (progress - start) / (end - start)),
  );

  return normalized * normalized * (3 - 2 * normalized);
}
