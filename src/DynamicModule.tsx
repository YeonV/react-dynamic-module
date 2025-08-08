import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

const moduleCache = new Map<string, {
    status: 'pending' | 'loading' | 'success' | 'failure';
    promise: Promise<any> | null;
    Component: React.ComponentType<any> | null;
}>();

type DynamicModuleBaseProps = {
    /** The name of the exported component property within the global variable. */
    import: string;
    /** The name of the global variable the script attaches to the window object. */
    from: string;
    /** The public path to the self-contained JavaScript module. */
    src: string;
    /** Optional: A React component to show while loading. Defaults to null. */
    loadingUi?: React.ReactNode;
    /** Optional: A React component to show if loading fails. Defaults to null. */
    errorUi?: React.ReactNode;
    /** Optional: An object of dependencies to inject into the window scope for the script to use. React and ReactDOM are always included. */
    dependencies?: Record<string, any>;
    /** Optional: A callback function to handle errors. */
    onError?: (error: Error) => void;
};
export type DynamicModuleProps<P extends object> = DynamicModuleBaseProps & P;

export const DynamicModule = <P extends object>(props: DynamicModuleProps<P>) => {
    const {
        import: exportName,
        from: globalName,
        src,
        loadingUi = null,
        errorUi = null,
        dependencies = {},
        ...componentProps
    } = props;

    if (!moduleCache.has(src)) {
        moduleCache.set(src, { status: 'pending', promise: null, Component: null });
    }
    const cacheEntry = moduleCache.get(src)!;

    const [status, setStatus] = useState(cacheEntry.status);

    useEffect(() => {
        if (cacheEntry.status !== 'pending') return;

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
                    Object.keys(tempGlobals).forEach(key => {
                        (window as any)[key] = tempGlobals[key];
                    });

                    document.body.appendChild(script);
                });

                const loadedGlobal = (window as any)[globalName];

                const tempGlobals: Record<string, any> = { React, ReactDOM, ...dependencies };
                Object.keys(tempGlobals).forEach(key => {
                    delete (window as any)[key];
                });

                if (loadedGlobal && typeof loadedGlobal[exportName] === 'function') {
                    cacheEntry.Component = loadedGlobal[exportName];
                    cacheEntry.status = 'success';
                } else {
                    throw new Error(`Module loaded, but export '${exportName}' not found on 'window.${globalName}'.`);
                }
            } catch (error) {
                if (props.onError) {
                    props.onError(error as Error);
                }
                // console.warn(`[DynamicModule] Failed to load module from ${src}:`, (error as Error).message);
                cacheEntry.status = 'failure';

                const tempGlobals: Record<string, any> = { React, ReactDOM, ...dependencies };
                Object.keys(tempGlobals).forEach(key => {
                    delete (window as any)[key];
                });
            }
        })();

        cacheEntry.promise.finally(() => {
            setStatus(cacheEntry.status);
        });

    }, [src, globalName, exportName, dependencies]);

    if (status === 'success' && cacheEntry.Component) {
        return <cacheEntry.Component {...(componentProps as P)} />;
    }
    if (status === 'failure') {
        return <>{errorUi}</>;
    }
    return <>{loadingUi}</>;
};
