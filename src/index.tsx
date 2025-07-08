/* @refresh reload */
import { render } from 'solid-js/web';
import { createSignal, onMount, createEffect, createResource } from 'solid-js';
import { createStore, Store, SetStoreFunction } from 'solid-js/store';
import { defaultExportMenu } from '@/components/exporter';
import { GM_getValue, GM_setValue, GM_registerMenuCommand, GM_info } from '$';

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

  if (state.tmpSettings.exportMenu?.length === 0) {
    state.tmpSettings.exportMenu = [...defaultExportMenu];
  }

  return state;
}

const isObject = (item: any) => item?.constructor === Object;

function merge(target: any, source: any) {
  Object.keys(source).forEach(key => {
    const targetValue = target[key];
    const sourceValue = source[key];
    if ((!isObject(targetValue) && targetValue !== undefined) && sourceValue) {
      const newValues = merge(targetValue, sourceValue);
      Object.assign(sourceValue, newValues);
    }
  });

  Object.assign(target ?? {}, source);
  return target;
}

function createGMStore<T extends object>(
  key: string, emptyState: T, initState: T
): [Store<T>, SetStoreFunction<T>] {
  const [state, setState] = createStore<T>(emptyState);

  if (GM_getValue(key)) {
    try {
      let saved = JSON.parse(GM_getValue(key));
      saved = upgradeState(key, saved);
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
  let client = await window.getAppShell().getHttpClient();
  let resp = await client.get("/mcp-micro/microapi-theme/microapi/v1/associates/userDevKey");
  return resp.data.devKey;
}

async function fetchOverviewData(devKey: string) {
  let client = await window.getAppShell().getHttpClient();
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
    if (window.getAppShell) {
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