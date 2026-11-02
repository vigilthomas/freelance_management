const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** 15-char [a-z0-9] id, compatible with PocketBase's default id pattern. */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(15));
  let id = '';
  // 252 = 7 * 36; rejecting bytes >= 252 keeps the distribution uniform.
  for (let i = 0; i < 15; i++) {
    let b = bytes[i];
    while (b >= 252) b = crypto.getRandomValues(new Uint8Array(1))[0];
    id += ALPHABET[b % 36];
  }
  return id;
}
