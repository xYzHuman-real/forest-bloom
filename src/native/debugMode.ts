// Hidden manual "+ Log" gate. Enabled by tapping the version label 5x in Profile,
// or by setting localStorage.treerise_debug = "1".
const KEY = "treerise_debug";

export function isDebugMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY) === "1";
}

export function setDebugMode(on: boolean) {
  if (typeof window === "undefined") return;
  if (on) window.localStorage.setItem(KEY, "1");
  else window.localStorage.removeItem(KEY);
}
