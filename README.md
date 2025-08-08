# React Dynamic Module

[![npm version](https://img.shields.io/npm/v/@yz-dev/react-dynamic-module.svg?style=flat-square)](https://www.npmjs.com/package/@yz-dev/react-dynamic-module)
[![license](https://img.shields.io/npm/l/@yz-dev/react-dynamic-module.svg?style=flat-square)](https://github.com/YeonV/react-dynamic-module/blob/main/LICENSE)
[![creator](https://img.shields.io/badge/CREATOR-YeonV-blue.svg?logo=github&logoColor=white)](https://github.com/YeonV)

The definitive solution for dynamically loading React components from external scripts. A powerful, modern toolkit for building modular applications, micro-frontends, and optional, dynamically-loaded features.

---

## ✨ At a Glance

Instantly understand the power and type safety of both the hook and the component.

#### The Hook (For full control)
```tsx
import { useDynamicModule } from '@yz-dev/react-dynamic-module';
import type { MyComponentProps } from 'my-component-types'; // Your component's props

const { status, as: MyComponent } = useDynamicModule<MyComponentProps>({
  src: '/modules/my-component.js',
  from: 'MyModule',
  import: 'MyComponent'
});

// Render it with full type safety and autocompletion.
if (MyComponent) {
  return <MyComponent someTypedProp="value" />;
}
```

#### The Component (For drop-in simplicity)
```tsx
import { DynamicModule } from '@yz-dev/react-dynamic-module';
import type { MyComponentProps } from 'my-component-types';

<DynamicModule<MyComponentProps>
  src="/modules/my-component.js"
  from="MyModule"
  import="MyComponent"
  // Pass props directly with full type safety.
  someTypedProp="value"
/>
```

---

## 🔥 Hot as Hell: Why You Need This

Tired of complex private package setups that block contributors? Need to lazy-load a feature that isn't part of your main bundle? This is the definitive solution.

-   **💎 True Optional Modules:** Load modules from a URL. If the module is missing, your app **will not crash**. It gracefully renders a fallback. Perfect for open-source apps with optional or external add-ons.
-   **🚀 Solves the "Duplicate React" Problem:** Uses a robust dependency injection pattern to ensure the dynamically loaded module shares your host application's instance of React, preventing cryptic `useState` errors.
-   **🔒 Full Type Safety & Autocompletion:** **This is the magic.** Use TypeScript generics (`<MyComponentProps>`) to get full, compile-time type checking and autocompletion for the props of your dynamically loaded component. No more `any` props.
-   **🛡️ Bulletproof & Graceful:** A `fetch` pre-flight check prevents 404s or server errors from causing uncatchable exceptions.
-   **💉 Powerful Dependency Injection:** Securely provide the loaded script with any dependencies it needs from the host application (`React`, `ReactDOM`, `MUI`, etc.).
-   **✌️ Dual API: Your Choice of Power or Simplicity.** The library exports both a powerful hook (`useDynamicModule`) for maximum control and a simple component (`<DynamicModule>`) for maximum convenience.

## 📦 Installation

```bash
# Using yarn
yarn add @yz-dev/react-dynamic-module

# Using pnpm
pnpm add @yz-dev/react-dynamic-module

# Using npm
npm install @yz-dev/react-dynamic-module
```

## ⚙️ API & Usage

You have two ways to use this library, depending on your needs.

### 1. The Hook: `useDynamicModule` (For Full Control)

Use the hook when you need to know the loading status *before* rendering your UI, for example, to conditionally show a button that opens the module.

```tsx
import { useDynamicModule } from '@yz-dev/react-dynamic-module';
import type { MyComponentProps } from 'my-component-types'; // Types from a shared package or stub
import { Button, Dialog, CircularProgress } from '@mui/material';

const MyFeature = () => {
  const [open, setOpen] = useState(false);

  const { status, as: MyComponent } = useDynamicModule<MyComponentProps>({
    src: '/modules/my-component.js',
    from: 'MyModule',
    import: 'MyComponent',
  });

  // Don't render the trigger button if the module isn't available
  if (status === 'unavailable' || status === 'checking') {
    return null;
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Optional Feature</Button>
      <Dialog open={open} onClose={() => setOpen(false)}>
        {status === 'available' && MyComponent ? (
          <MyComponent someTypedProp="value" />
        ) : (
          <CircularProgress />
        )}
      </Dialog>
    </>
  );
};
```

#### Hook Return Value

| Property   | Type                                      | Description                                                                                             |
| ---------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `status`   | `'checking' \| 'loading' \| 'available' \| 'unavailable'` | The current loading state of the module.                                                                |
| `as`       | `React.ComponentType<P> \| null`          | If the status is `available`, this will be the loaded React component. Otherwise, it will be `null`.     |


### 2. The Component: `<DynamicModule />` (For Simplicity)

Use the component when you want a simple, declarative, "drop-in" solution.

```tsx
import { DynamicModule } from '@yz-dev/react-dynamic-module';
import type { MyComponentProps } from 'my-component-types';
import { CircularProgress, Typography } from '@mui/material';

const MyFeature = (props) => {
  return (
    <DynamicModule<MyComponentProps>
      // --- Core Props ---
      src="/modules/my-component.js"
      from="MyModule"
      import="MyComponent"
      
      // --- Optional ---
      loadingUi={<CircularProgress />}
      errorUi={<Typography color="error">Feature Not Available.</Typography>}

      // --- Pass-through Props for the loaded component (fully type-safe!) ---
      {...props}
    />
  );
};
```

#### Component Props

| Prop           | Type                               | Required | Description                                                                                             |
| -------------- | ---------------------------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `src`          | `string`                           | Yes      | The public path to the JavaScript module to load.                                                       |
| `from`         | `string`                           | Yes      | The name of the global variable the script will attach its exports to (e.g., `window.MyModule`).       |
| `import`       | `string`                           | Yes      | The name of the exported component property on the global variable (e.g., `MyModule.MyComponent`).      |
| `loadingUi`    | `React.ReactNode`                  | No       | A component to render while the module is loading.                                                      |
| `errorUi`      | `React.ReactNode`                  | No       | A component to render if the module fails to load.                                                      |
| `dependencies` | `Record<string, any>`              | No       | An object of dependencies to inject into the `window` scope. `React` and `ReactDOM` are always included. |
| `onError`      | `(error: Error) => void`           | No       | A callback fired if any error occurs during loading.                                                    |
| `...rest`      | `any`                              | No       | All other props are passed directly to the successfully loaded component.                               |


## 🛠️ Building a Compatible Module (Example with Vite)

To create a script that can be loaded by this library, build it as an `iife` (Immediately Invoked Function Expression) and externalize its peer dependencies.

**`vite.config.ts` for the module you want to load:**
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      name: 'MyModule', // This must match the 'from' prop
      formats: ['iife'],
      fileName: () => `my-module.js`,
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          'react': 'React',
          'react-dom': 'ReactDOM',
        },
        exports: 'named',
      },
    },
  },
});
```

**`src/index.ts` for the module:**
```ts
export { MyComponent } from './components/MyComponent'; // This must match the 'import' prop
```

## 🤝 Contributing

Contributions are welcome! If you have a feature request, bug report, or want to contribute to the code, please feel free to open an issue or submit a pull request.
