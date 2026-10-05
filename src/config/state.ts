export function makeEval(args: string, str: string, defaultFunc: Function) {
  try {
    return new Function(args, "return " + str);
  } catch {
    return defaultFunc;
  }
}

class Formats {
  formatOwnComment: CallableFunction;
  formatCommentMinuses: CallableFunction;
  formatStoryMinuses: CallableFunction;
}

export const formats = new Formats();

export const waitConfig = () =>
  new Promise<void>((resolve) => {
    let isInit = () =>
      setTimeout(() => (appState.isConfigInit ? resolve() : isInit()), 1);
    isInit();
  });

export const appState = {
  enableFilters: null as any,
  isConfigInit: false,
  csrfToken: null as string | null,
  observer: null as MutationObserver | null,
};
