// react-dynamic-module/src/useDynamicModule.ts

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

// One in-flight (or settled) script load per bundle `src`. Resolves to the
// bundle's window global object (window[globalName]). Guarantees the <script>
// is fetched + injected EXACTLY ONCE per src, no matter how many exports are
// read off it.
const scriptCache = new Map<string, Promise<any>>();

// Per (src, import) resolution state. Keying by src ALONE was a bug: two
// useDynamicModule calls on the same bundle but different `import` shared one
// entry, so the second call's effect short-circuited on the first's status and
// never resolved its own export (the dashboard hung on "loading" forever).
// Keyed by `src::import` so every export off a bundle resolves independently.
const exportCache = new Map<string, {
  status: 'checking' | 'loading' | 'available' | 'unavailable';
  Component: React.ComponentType<any> | null;
}>();

interface UseDynamicModuleOptions {
  src: string;
  from: string;
  import: string;
  dependencies?: Record<string, any>;
}

/** Fetch + inject the bundle script once per src, returning its window global.
 *  Sets React/ReactDOM/dependencies on window BEFORE injecting so the module's
 *  runtime hooks resolve them. */
function loadBundle(
  src: string,
  globalName: string,
  dependencies: Record<string, any>,
): Promise<any> {
  const existing = scriptCache.get(src);
  if (existing) return existing;

  const promise = (async () => {
    const response = await fetch(src);
    if (!response.ok || response.headers.get('content-type')?.includes('text/html')) {
      throw new Error(`Module not found at ${src}`);
    }

    // Set globals BEFORE loading script — they need to persist for runtime
    // hooks. CRITICAL: only set if not already set, to avoid multiple React
    // copies.
    if (!(window as any).React) {
      (window as any).React = React;
    }
    if (!(window as any).ReactDOM) {
      (window as any).ReactDOM = ReactDOM;
    }
    Object.keys(dependencies).forEach((key) => {
      (window as any)[key] = dependencies[key];
    });

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = (err) => reject(err);
      document.body.appendChild(script);
    });

    // DO NOT delete globals — components need them at runtime for hooks!
    return (window as any)[globalName];
  })();

  scriptCache.set(src, promise);
  return promise;
}

export const useDynamicModule = <P extends object>({
  src,
  from: globalName,
  import: exportName,
  dependencies = {},
}: UseDynamicModuleOptions) => {

  const cacheKey = `${src}::${exportName}`;
  if (!exportCache.has(cacheKey)) {
    exportCache.set(cacheKey, { status: 'checking', Component: null });
  }
  const cacheEntry = exportCache.get(cacheKey)!;

  const [status, setStatus] = useState(cacheEntry.status);

  useEffect(() => {
    if (cacheEntry.status !== 'checking') return;

    cacheEntry.status = 'loading';
    setStatus('loading');

    loadBundle(src, globalName, dependencies)
      .then((loadedGlobal) => {
        const exportedValue = loadedGlobal?.[exportName];
        // A valid export is a React component (function) or a forwardRef/memo
        // object — or, by the same `function` test, a plain factory function
        // (e.g. a `createSatelliteApi`) read off the same bundle.
        const isValidExport = exportedValue && (
          typeof exportedValue === 'function' ||
          (typeof exportedValue === 'object' && exportedValue.$$typeof)
        );

        if (isValidExport) {
          cacheEntry.Component = exportedValue;
          cacheEntry.status = 'available';
        } else {
          throw new Error(
            `Module loaded, but export '${exportName}' not found on 'window.${globalName}'.`,
          );
        }
      })
      .catch((error) => {
        console.warn(
          `[useDynamicModule] Could not load export '${exportName}' from ${src}:`,
          (error as Error).message,
        );
        cacheEntry.status = 'unavailable';
      })
      .finally(() => {
        setStatus(cacheEntry.status);
      });

  }, [src, globalName, exportName, dependencies]);

  return {
    status,
    as: cacheEntry.Component as React.ComponentType<P> | null,
  };
};
