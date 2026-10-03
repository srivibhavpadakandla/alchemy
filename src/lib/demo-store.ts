import { State, StateSchema, seed } from "./domain";
import { applyCommand, Command } from "./commands";
const name = "launchguild-fictional-v1";
function broadcastChange() {
  const channel = new BroadcastChannel(name);
  channel.postMessage("changed");
  channel.close();
}
function open() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open(name, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("programs");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function readDemo(): Promise<State> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("programs", "readwrite"),
      store = tx.objectStore("programs");
    let state: State;
    const r = store.get("demo");
    r.onsuccess = () => {
      try {
        state = r.result ? StateSchema.parse(r.result) : seed();
        if (!r.result) store.put(state, "demo");
      } catch (e) {
        tx.abort();
        reject(e);
      }
    };
    tx.oncomplete = () => {
      db.close();
      resolve(state);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
export async function mutateDemo(command: Command): Promise<State> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("programs", "readwrite"),
      store = tx.objectStore("programs");
    let next: State;
    const r = store.get("demo");
    r.onsuccess = () => {
      try {
        next = applyCommand(
          StateSchema.parse(r.result ?? seed()),
          command,
          "Demo founder",
        );
        store.put(next, "demo");
      } catch (e) {
        tx.abort();
        reject(e);
      }
    };
    tx.oncomplete = () => {
      db.close();
      broadcastChange();
      resolve(next);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
export async function resetDemo() {
  const db = await open();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("programs", "readwrite");
    tx.objectStore("programs").put(seed(), "demo");
    tx.oncomplete = () => {
      db.close();
      broadcastChange();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}
export function subscribeDemo(fn: () => void) {
  const channel = new BroadcastChannel(name);
  channel.onmessage = fn;
  return () => channel.close();
}
