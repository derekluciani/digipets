# Instructions for importing Shadcn and Tailwind v4

## Installation using Vite

1. Start by creating a new Vite project if you don’t have one set up already.
```bsh
npm create vite@latest app
cd app
```

2. Install `tailwindcss` and `@tailwindcss/vite` via npm.
```bsh
npm install tailwindcss @tailwindcss/vite
```

3. Add the `@tailwindcss/vite` plugin to your Vite configuration.
**vite.config.ts**
```typescript
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
})
```

4. Add an `@import` to your CSS file that imports Tailwind CSS.
```css
@import "tailwindcss"; 
```

5. Edit `tsconfig.json` file. The current version of Vite splits TypeScript configuration into three files, two of which need to be edited. Add the `baseUrl` and `paths` properties to the `compilerOptions` section of the `tsconfig.json` and `tsconfig.app.json` files:
**tsconfig.json**
```json
{
  "files": [],
  "references": [
    {
      "path": "./tsconfig.app.json"
    },
    {
      "path": "./tsconfig.node.json"
    }
  ],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```
**tsconfig.app.json**
```json
{
  "compilerOptions": {
    // ...
    "baseUrl": ".",
    "paths": {
      "@/*": [
        "./src/*"
      ]
    }
    // ...
  }
}
```

6. Update `vite.config.ts`. Add the following code to the vite.config.ts so your app can resolve paths without error:
````bsh
npm install -D @types/node
````
**vite.config.ts**
````typescript
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
````

7. Run the `shadcn` init command to setup your project:
````bsh
npx shadcn@latest init
````
- You will be asked a few questions to configure `components.json`
- Then you can now start adding components to your project:
````bsh
npx shadcn@latest add {componentname}
````

!END