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

        // Set globals BEFORE loading script - they need to persist for runtime hooks
        // CRITICAL: Only set if not already set, to avoid multiple React copies
        if (!(window as any).React) {
          (window as any).React = React;
        }
        if (!(window as any).ReactDOM) {
          (window as any).ReactDOM = ReactDOM;
        }
        // Set other dependencies
        Object.keys(dependencies).forEach(key => { (window as any)[key] = dependencies[key]; });

        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = src;
          script.async = true;
          script.onload = () => resolve();
          script.onerror = (err) => reject(err);
          document.body.appendChild(script);
        });

        const loadedGlobal = (window as any)[globalName];
        // DO NOT delete globals - components need them at runtime for hooks!

        const exportedValue = loadedGlobal?.[exportName];
        // Check for React component (function or forwardRef/memo object)
        const isValidComponent = exportedValue && (
          typeof exportedValue === 'function' || 
          (typeof exportedValue === 'object' && exportedValue.$$typeof)
        );

        if (isValidComponent) {
          cacheEntry.Component = exportedValue;
          cacheEntry.status = 'available';
        } else {
          throw new Error(`Module loaded, but export '${exportName}' not found on 'window.${globalName}'.`);
        }
      } catch (error) {
        console.warn(`[useDynamicModule] Could not load module from ${src}:`, (error as Error).message);
        cacheEntry.status = 'unavailable';
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