// react-dynamic-module/src/useDynamicModule.ts

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

const moduleCache = new Map<string, {
  status: 'checking' | 'loading' | 'available' | 'unavailable';
  promise: Promise<any> | null;
  Component: React.ComponentType<any> | null;
}>();

interface UseDynamicModuleOptions {
  src: string;
  from: string;
  import: string;
  dependencies?: Record<string, any>;
}

export const useDynamicModule = <P extends object>({
  src,
  from: globalName,
  import: exportName,
  dependencies = {}
}: UseDynamicModuleOptions) => {
  
  if (!moduleCache.has(src)) {
    moduleCache.set(src, { status: 'checking', promise: null, Component: null });
  }
  const cacheEntry = moduleCache.get(src)!;

  const [status, setStatus] = useState(cacheEntry.status);

  useEffect(() => {
    if (cacheEntry.status !== 'checking') return;

    cacheEntry.status = 'loading';
    setStatus('loading');

    cacheEntry.promise = (async () => {
      try {
        const response = await fetch(src);
        if (!response.ok || response.headers.get('content-type')?.includes('text/html')) {
          throw new Error(`Module not found at ${src}`);
        }

        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = src;
          script.async = true;
          script.onload = () => resolve();
          script.onerror = (err) => reject(err);

          const tempGlobals: Record<string, any> = { React, ReactDOM, ...dependencies };
          Object.keys(tempGlobals).forEach(key => { (window as any)[key] = tempGlobals[key]; });
          document.body.appendChild(script);
        });

        const loadedGlobal = (window as any)[globalName];
        const tempGlobals: Record<string, any> = { React, ReactDOM, ...dependencies };
        Object.keys(tempGlobals).forEach(key => { delete (window as any)[key]; });

        if (loadedGlobal && typeof loadedGlobal[exportName] === 'function') {
          cacheEntry.Component = loadedGlobal[exportName];
          cacheEntry.status = 'available';
        } else {
          throw new Error(`Module loaded, but export '${exportName}' not found on 'window.${globalName}'.`);
        }
      } catch (error) {
        console.warn(`[useDynamicModule] Could not load module from ${src}:`, (error as Error).message);
        cacheEntry.status = 'unavailable';
        const tempGlobals: Record<string, any> = { React, ReactDOM, ...dependencies };
        Object.keys(tempGlobals).forEach(key => { delete (window as any)[key]; });
      }
    })();

    cacheEntry.promise.finally(() => {
      setStatus(cacheEntry.status);
    });

  }, [src, globalName, exportName, dependencies]);

  return {
    status,
    as: cacheEntry.Component as React.ComponentType<P> | null,
  };
};