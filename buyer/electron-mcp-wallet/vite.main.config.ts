import path from 'path';

// Plugin to exclude .node files from being processed
const excludeNodeFiles = () => {
  return {
    name: 'exclude-node-files',
    enforce: 'pre' as const, // Run this plugin early - must run before other resolvers
    resolveId(id: string) {
      // Mark .node files as external to skip processing
      // Check for .node extension first
      if (id.endsWith('.node')) {
        return { id, external: true };
      }
      // Check if the resolved path contains .node
      if (id.includes('.node')) {
        return { id, external: true };
      }
      return null;
    },
    load(id: string) {
      // Fallback: if a .node file somehow gets to the load stage, prevent processing
      if (id.endsWith('.node') || id.includes('.node')) {
        // Return null to skip, but this shouldn't be reached if resolveId works correctly
        return null;
      }
      return null;
    },
  };
};

// https://vitejs.dev/config
export default {
  plugins: [excludeNodeFiles()],
  build: {
    rollupOptions: {
      external: (id: string) => {
        // Externalize Electron and related packages
        if (id === 'electron' || id.startsWith('electron/')) return true;
        if (id === 'electron-squirrel-startup') return true;
        if (id === 'electron-log') return true;
        
        // Externalize Node.js built-ins (node: protocol)
        if (id.startsWith('node:')) return true;
        
        // Externalize .node files (native addons) - check both direct paths and within node_modules
        // This must come before the node_modules check to catch absolute paths
        if (id.endsWith('.node')) return true;
        if (id.includes('.node')) return true;
        
        // Externalize all other node_modules for main process
        // They will be available at runtime in Electron
        if (!id.startsWith('.') && !id.startsWith('/') && !path.isAbsolute(id)) {
          return true;
        }
        
        // Also externalize absolute paths that are in node_modules
        if (path.isAbsolute(id) && id.includes('node_modules')) {
          return true;
        }
        
        return false;
      },
    },
  },
  resolve: {
    // Prevent Vite from trying to resolve .node files
    extensions: ['.js', '.ts', '.json'],
  },
  ssr: {
    // Mark .node files as external for SSR (which Electron main process uses)
    noExternal: [], // Don't bundle anything for SSR
  },
  optimizeDeps: {
    // Disable esbuild optimization for native modules
    esbuildOptions: {
      plugins: [],
    },
  },
};
