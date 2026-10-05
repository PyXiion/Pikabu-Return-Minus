const logPrefix = "[RPM]";

export function info(...args: any): void {
  if (GM_config === undefined || GM_config.get === undefined) return;
  if (GM_config.get("debug")) {
    console.info(logPrefix, ...args);
  }
}

export function warn(...args: any): void {
  if (GM_config === undefined || GM_config.get === undefined) return;
  if (GM_config.get("debug")) {
    console.warn(logPrefix, ...args);
  }
}

export function error(...args: any): void {
  if (GM_config === undefined || GM_config.get === undefined) return;
  if (GM_config.get("debug")) {
    console.error(logPrefix, ...args);
  }
}
