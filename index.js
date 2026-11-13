/**
 * Host half of the Chinese skill search bundle.
 *
 * The whole feature lives in the browser (`./client.js`): it registers an
 * extra "/" source whose candidates carry the skill's Chinese name as the
 * label, which the menu treats as its second search key. No host capability
 * is needed, so this entry registers nothing — it exists because a bundle row
 * must resolve.
 */
export function apply() {}
