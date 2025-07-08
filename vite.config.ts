import { defineConfig, loadEnv } from "vite";
import solidPlugin from "vite-plugin-solid";
import path from "path";
// import { exec } from 'node:child_process';
import monkey from 'vite-plugin-monkey';
// import mkcert from 'vite-plugin-mkcert'

export default defineConfig({
  // server: {
  //   host: "localhost.adp.com"
  // },
  plugins: [
    // mkcert(),
    solidPlugin(),
    monkey({
      entry: 'src/index.tsx',
      build: {
        autoGrant: false,
      },
      userscript: {
        name: "ADP export",
        icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWhhcmQtZHJpdmUtZG93bmxvYWQiPjxwYXRoIGQ9Ik0xMiAydjgiLz48cGF0aCBkPSJtMTYgNi00IDQtNC00Ii8+PHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjgiIHg9IjIiIHk9IjE0IiByeD0iMiIvPjxwYXRoIGQ9Ik02IDE4aC4wMSIvPjxwYXRoIGQ9Ik0xMCAxOGguMDEiLz48L3N2Zz4=',
        namespace: 'kdar',
        'run-at': 'document-idle',
        match: ['https://portal.people.adp.com/*', 'https://online.emea.adp.com/*'],
        downloadURL: 'https://github.com/kdar/adp-export/releases/latest/download/adp-export.user.js',
        updateURL: 'https://github.com/kdar/adp-export/releases/latest/download/adp-export.user.js',
        supportURL: 'https://github.com/kdar/adp-export/issues',
        description: 'Exports ADP paystub data in JSON and CSV',
        author: 'Kevin Darlington',
        version: '0.0.6',
        grant: ['GM_getValue', 'GM_setValue', 'GM_info', 'GM_registerMenuCommand'],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@components": path.resolve(__dirname, "src/components"),
      "@utils": path.resolve(__dirname, "src/utils"),
    },
  },
});


// export default ({ mode }) => {
//   // Make Vite env vars available.
//   // https://stackoverflow.com/a/66389044
//   process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };
//   const userscriptBuild = process.env.USERSCRIPT_BUILD;

//   return defineConfig({
//     plugins: [
//       solidPlugin(),
//       cssInjectedByJsPlugin({
//         injectCode: (cssCode, options) => {
//           return `try{if(typeof document != 'undefined'){GM.addStyle(${cssCode});}}catch(e){console.error('vite-plugin-css-injected-by-js', e);}`;
//         },
//       }),
//       {
//         name: 'postbuild-commands',
//         apply: 'build',
//         closeBundle() {
//           if (userscriptBuild !== undefined) {
//             exec(`userscript-builder --mode ${userscriptBuild}`, (_, output, err) => {
//               if (output) console.log(output);
//               if (err) console.log(err);
//             });
//           }
//         }
//       },
//     ],
//     server: {
//       port: 3000,
//     },
//     build: {
//       target: "esnext",
//       rollupOptions: {
//         input: "src/index.tsx",
//         output: {
//           entryFileNames: "[name].js",
//         },
//       },
//     },
//     resolve: {
//       alias: {
//         "@": path.resolve(__dirname, "src"),
//         "@components": path.resolve(__dirname, "src/components"),
//         "@utils": path.resolve(__dirname, "src/utils"),
//       },
//     },
//   });
// };