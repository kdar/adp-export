/* @refresh reload */
import { render } from 'solid-js/web';
import { createSignal, onMount, createEffect, createResource } from 'solid-js';
import { createStore, Store, SetStoreFunction } from 'solid-js/store';
import { defaultExportMenu } from '@/components/exporter';
import { GM_getValue, GM_setValue, GM_registerMenuCommand, GM_info, unsafeWindow } from '$';

import App from '@/App';
import '@/index.css';

const latestStateVersion = 2;
const root = document.body;

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found.',
  );
}

function upgradeState(storageKey: string, state: any): any {
  let version = state.version ?? 1;
  for (let x = version; x < latestStateVersion; x++) {
    // Upgrade from version 1 to 2.
    if (x === 1) {
      GM_setValue(`${storageKey}.v1`, JSON.stringify(state));
      let newState = {
        version: 2,
        tmpSettings: {
          mapping: state.tmpMapping ?? [],
          exportMenu: [...defaultExportMenu],
        },
        settings: {
          mapping: state.mapping ?? [],
          exportMenu: [...defaultExportMenu]
        },
      };
      state = newState;
    }
  }

  if (!state.tempSettings) {
    state.tempSettings = {};
  }

  if (state.tmpSettings.exportMenu?.length === 0) {
    state.tmpSettings.exportMenu = [...defaultExportMenu];
  }

  return state;
}

// function isObject(v: any) {
//   return typeof v === 'object' &&
//     v !== null &&
//     Object.prototype.toString.call(v) === '[object Object]';
// }

// function merge(target: any, source: any) {
//   if (isObject(source)) {
//     Object.keys(source).forEach(key => {
//       const targetValue = target[key];
//       const sourceValue = source[key];
//       if ((!isObject(targetValue) && targetValue !== undefined) && sourceValue) {
//         const newValues = merge(targetValue, sourceValue);
//         console.log(sourceValue, newValues);
//         Object.assign(sourceValue, newValues);
//       }
//     });
//     console.log(target, source);
//     Object.assign(target ?? {}, source);
//   }

//   return target;
// }

function merge(target: any, source: any) {
  // Handle cases where target or source are not objects or are null
  if (typeof target !== 'object' || target === null || typeof source !== 'object' || source === null) {
    return source; // If not objects or one is null, return the source directly
  }

  // Create a new object for the result to avoid modifying the original target
  const result = { ...target };

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key]) &&
        typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key])) {
        // If both properties are non-null, non-array objects, recursively merge them
        result[key] = merge(result[key], source[key]);
      } else {
        // Otherwise, assign the source property to the result (overwriting if exists)
        result[key] = source[key];
      }
    }
  }

  return result;
}

function createGMStore<T extends object>(
  key: string, emptyState: T, initState: T
): [Store<T>, SetStoreFunction<T>] {
  const [state, setState] = createStore<T>(emptyState);

  if (GM_getValue(key)) {
    try {
      let saved = JSON.parse(GM_getValue(key));
      saved = upgradeState(key, saved);
      // console.log(initState, saved);
      setState(merge({ ...initState }, saved));
    } catch (error) {
      console.error(error);
      setState(initState);
    }
  }

  createEffect(() => {
    GM_setValue(key, JSON.stringify(state));
  });

  return [state, setState];
}

async function fetchDevKey() {
  let client = await unsafeWindow.getAppShell().getHttpClient();
  let resp = await client.get("/mcp-micro/microapi-theme/microapi/v1/associates/userDevKey");
  return resp.data.devKey;
}

async function fetchOverviewData(devKey: string) {
  let client = await unsafeWindow.getAppShell().getHttpClient();
  const overviewData = await client.get(`/gvservice/${devKey}/ess/pay/overview`);

  const j = {
    "buckets": overviewData.data.buckets,
    "payments": overviewData.data.payments.map((v: any) => {
      if (v.date.toISOString) {
        let parts = v.date.toISOString().split("T");
        v.date = parts[0];
      }
      return v;
    }),
  };

  return j;
}

function ready(fn: any) {
  let id = setInterval(() => {
    if (unsafeWindow.getAppShell) {
      clearInterval(id);
      fn();
    }
  }, 1000);
}

async function main() {
  'use strict';

  const [devKey] = createResource(fetchDevKey);
  const [overviewData] = createResource(devKey, fetchOverviewData);
  let [settingsModal, setSettingsModal] = createSignal<HTMLDialogElement | null>(null);
  const [store, setStore] = createGMStore('adp-export', {}, {
    version: latestStateVersion,
    settingsTab: "tab1",
    tmpSettings: {
      mapping: [],
      exportMenu: [...defaultExportMenu]
    },
    settings: {
      mapping: [],
      exportMenu: [...defaultExportMenu]
    },
  });

  render(() => {
    onMount(() => {
      GM_registerMenuCommand(`${GM_info.script.name} Open`, async () => {
        settingsModal()?.showModal();
      });
    });

    return <App settingsModalRef={setSettingsModal} store={store} setStore={setStore} overviewData={overviewData} devKey={devKey} />;
  }, root);
}

ready(main);