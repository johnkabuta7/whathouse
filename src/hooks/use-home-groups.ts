// Home groups pinning: user selects which groups from Contacts appear on Home.
const HOME_KEY = 'wh_home_groups';

export function getHomeGroupIds(): string[] {
  try { return JSON.parse(localStorage.getItem(HOME_KEY) || '[]'); } catch { return []; }
}
export function setHomeGroupIds(ids: string[]) {
  localStorage.setItem(HOME_KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent('wh_home_groups_changed'));
}
export function isPinnedHome(id: string): boolean {
  return getHomeGroupIds().includes(id);
}
export function togglePinnedHome(id: string): boolean {
  const cur = new Set(getHomeGroupIds());
  if (cur.has(id)) cur.delete(id); else cur.add(id);
  setHomeGroupIds(Array.from(cur));
  return cur.has(id);
}
export function addPinnedHome(ids: string[]) {
  const cur = new Set(getHomeGroupIds());
  ids.forEach(i => cur.add(i));
  setHomeGroupIds(Array.from(cur));
}
export function removePinnedHome(ids: string[]) {
  const cur = new Set(getHomeGroupIds());
  ids.forEach(i => cur.delete(i));
  setHomeGroupIds(Array.from(cur));
}
