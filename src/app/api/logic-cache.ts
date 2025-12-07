// src/app/api/logic-cache.ts
// Этот файл создает глобальное хранилище в оперативной памяти.
// Оно будет "жить", пока работает серверный процесс.

// Используем Map для хранения кода модулей: 'moduleName' -> 'sourceCode'
const logicStore = new Map<string, string>();
let loaded = false;

export function storeLogic(moduleName: string, code: string) {
  logicStore.set(moduleName, code);
}

export function retrieveLogic(moduleName: string): string | undefined {
  return logicStore.get(moduleName);
}

export function markAsLoaded() {
  loaded = true;
}

export function isLogicLoaded(): boolean {
  return loaded;
}
