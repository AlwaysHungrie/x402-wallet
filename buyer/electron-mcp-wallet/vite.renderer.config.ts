import path from 'path';

// https://vitejs.dev/config
// Using a factory function to handle ESM-only plugin
// This async function allows us to dynamically import the ESM-only @vitejs/plugin-react
export default async () => {
  const { default: react } = await import('@vitejs/plugin-react');
  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        input: path.resolve(__dirname, 'src/index.html'),
      },
    },
  };
};
