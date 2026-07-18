import { createRequire } from 'module';
import react from '@vitejs/plugin-react';
import { transform } from 'esbuild';
import { defineConfig, loadEnv, normalizePath } from 'vite';

const require = createRequire(import.meta.url);
const { allowedClientEnvKeys, scrubClientEnv } = require('./scripts/scrubClientEnv');
const srcJsFileRE = /\/src\/.*\.js$/;

const jsxInJsPlugin = () => ({
  name: 'new-blog:jsx-in-js',
  enforce: 'pre',
  async transform(code, id) {
    const [filepath] = id.split('?');
    if (!srcJsFileRE.test(normalizePath(filepath))) {
      return null;
    }

    const result = await transform(code, {
      loader: 'jsx',
      jsx: 'automatic',
      sourcefile: filepath,
      sourcemap: true,
      target: 'es2020',
    });

    return {
      code: result.code,
      map: result.map || null,
    };
  },
});

const buildClientEnvDefinitions = (mode) => {
  scrubClientEnv();
  const loadedEnv = loadEnv(mode, process.cwd(), '');
  const env = { ...loadedEnv, ...process.env };
  const nodeEnv = mode === 'production' ? 'production' : 'development';
  const definitions = {
    'process.env.NODE_ENV': JSON.stringify(nodeEnv),
    'process.env.PUBLIC_URL': JSON.stringify(''),
    'process.env.npm_package_version': JSON.stringify(process.env.npm_package_version || ''),
  };

  allowedClientEnvKeys.forEach((key) => {
    definitions[`process.env.${key}`] = JSON.stringify(env[key] || '');
  });

  return definitions;
};

export default defineConfig(({ mode }) => ({
  plugins: [
    jsxInJsPlugin(),
    react({
      include: /\.(js|jsx|ts|tsx)$/,
    }),
  ],
  define: buildClientEnvDefinitions(mode),
  publicDir: 'public',
  oxc: {
    include: /src\/.*\.(js|jsx|ts|tsx)$/,
    exclude: /node_modules/,
    jsx: 'react-jsx',
  },
  server: {
    port: 3000,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 3000,
    strictPort: false,
  },
  build: {
    outDir: 'build',
    sourcemap: false,
    emptyOutDir: true,
    rolldownOptions: {
      moduleTypes: {
        '.js': 'jsx',
      },
    },
  },
  test: {
    environment: 'node',
    globals: true,
  },
}));
