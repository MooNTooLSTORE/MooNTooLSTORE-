
// src/app/api/loader.ts
import vm from 'vm';
import { retrieveLogic, isLogicLoaded } from './logic-cache';
import * as TelegramApi from './telegram/api';
import * as TelegramUtils from './telegram/utils';
import * as StatusApi from './status/route';
import { logEvent } from '@/lib/logger';
import { NextResponse } from 'next/server';

const sharedDependencies = {
  'mongodb': require('mongodb'),
  'redis': require('redis'),
  'next/server': require('next/server'),
  'next/headers': require('next/headers'),
  'iron-session': require('iron-session'),
  '@/lib/session': require('@/lib/session'),
  '@/app/api/telegram/api': TelegramApi,
  '@/app/api/telegram/utils': TelegramUtils,
  '@/app/api/status/route': StatusApi,
  '@/lib/logger': { logEvent },
};

export async function loadLogic(moduleName: string): Promise<any> {
  const code = retrieveLogic(moduleName);

  if (!code) {
    // В продакшене это будет означать, что система не активирована.
    // Возвращаем "пустой" модуль с функциями-заглушками.
    const methods = ['GET', 'POST', 'PUT', 'DELETE'];
    const emptyModule: {[key: string]: any} = {};
    for (const method of methods) {
        emptyModule[method] = () => NextResponse.json({ error: `System not activated. Module '${moduleName}' not found.` }, { status: 403 });
    }
    return emptyModule;
  }

  const sandbox: any = {
    module: { exports: {} },
    exports: {},
    require: (path: string) => {
      if (sharedDependencies[path as keyof typeof sharedDependencies]) {
        return sharedDependencies[path as keyof typeof sharedDependencies];
      }
      // If module is not in shared, it might be a relative path from within the API folder
      // We need to resolve it and load it using our own loader.
      // This is a simplified version; a real implementation would need more robust path resolution.
      if(path.startsWith('../')){
          const newModuleName = require('path').join(require('path').dirname(moduleName), path).replace(/\\/g, '/');
          // For simplicity, we are not implementing recursive sandboxed loading here.
          // This assumes that inter-module dependencies are also in the sharedDependencies.
          // A more complex system would recursively call `loadLogic`.
          // For now, let's just log it.
          logEvent('warn', `Attempted to load relative module '${path}' from '${moduleName}'. This is not fully supported.`);
          
          if(path === '../loader'){
              return { loadLogic, isLogicLoaded };
          }
      }

      throw new Error(`Module not found: ${path}. Only shared dependencies are allowed.`);
    },
    console: console, // Даем доступ к консоли для отладки
  };
  
  vm.createContext(sandbox);
  
  try {
    vm.runInContext(code, sandbox, {
        filename: moduleName,
        timeout: 15000 // Increased timeout for potentially long operations
    });
  } catch (e: any) {
     console.error(`Error executing sandboxed module ${moduleName}:`, e);
     await logEvent('error', `VM Execution Error in ${moduleName}`, { error: e.message, stack: e.stack });
     throw new Error(`Failed to load logic for ${moduleName}`);
  }


  return sandbox.module.exports;
}

export { isLogicLoaded } from './logic-cache';
