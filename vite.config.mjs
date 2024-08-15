import { defineConfig, loadEnv } from "vite";
import solidPlugin from "vite-plugin-solid";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";
import path from "path";
import { exec } from 'node:child_process';

export default ({ mode }) => {
  // Make Vite env vars available.
  // https://stackoverflow.com/a/66389044
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };
  const userscriptBuild = process.env.USERSCRIPT_BUILD;

  return defineConfig({
    plugins: [
      solidPlugin(),
      cssInjectedByJsPlugin({
        injectCode: (cssCode, options) => {
          return `try{if(typeof document != 'undefined'){GM.addStyle(${cssCode});}}catch(e){console.error('vite-plugin-css-injected-by-js', e);}`;
        },
      }),
      {
        name: 'postbuild-commands',
        apply: 'build',
        closeBundle() {
          if (userscriptBuild !== undefined) {
            exec(`userscript-builder --mode ${userscriptBuild}`, (_, output, err) => {
              if (output) console.log(output);
              if (err) console.log(err);
            });
          }
        }
      },
    ],
    server: {
      port: 3000,
    },
    build: {
      target: "esnext",
      rollupOptions: {
        input: "src/index.tsx",
        output: {
          entryFileNames: "[name].js",
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@components": path.resolve(__dirname, "src/components"),
        "@utils": path.resolve(__dirname, "src/utils"),
      },
    },
  });
};