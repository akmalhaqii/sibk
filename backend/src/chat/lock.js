// C3: satu antrean Qwen pada satu waktu di seluruh backend untuk chat
let active = false;

export function acquireChatLock() {
  if (active) return null;
  active = true;
  let released = false;
  return () => {
    if (!released) {
      released = true;
      active = false;
    }
  };
}

export function isChatLocked() {
  return active;
}
