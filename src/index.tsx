/* @refresh reload */
import { render } from 'solid-js/web';
import { createSignal, onMount, createEffect } from 'solid-js';
import { createStore, Store, SetStoreFunction } from 'solid-js/store';
import { Exporter, defaultExportMenu } from '@/components/exporter';
import { waitForMultiple, waitForSingle } from '@/utils/wait';
import { GM_getValue, GM_setValue, GM_registerMenuCommand, GM_info, unsafeWindow, monkeyWindow } from '$';

import Main from '@/App';
import '@/index.css';

const latestStateVersion = 2;
const root = document.body;

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found.',
  );
}

function upgradeState(storageKey: string, state: any): any {
  let version = state.version || 1;
  for (let x = version; x < latestStateVersion; x++) {
    switch (x) {
      // Upgrade from version 1 to 2.
      case 1: {
        GM_setValue(`${storageKey}.v1`, JSON.stringify(state));
        let newState = {
          version: 2,
          tmpSettings: {
            mapping: state.tmpMapping || [],
            exportMenu: [...defaultExportMenu],
          },
          settings: {
            mapping: state.mapping || [],
            exportMenu: [...defaultExportMenu]
          },
        };
        state = newState;
        break;
      }
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

  Object.assign(target || {}, source);
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
      setState(initState);
    }
  }

  createEffect(() => {
    GM_setValue(key, JSON.stringify(state));
  });

  return [state, setState];
}


(async () => {
  'use strict';

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

  // const mountExporter = async () => {
  //   if (!/.*\/pay.*/.test(location.hash)) { return; }

  //   let [payHistoryEl]: HTMLElement[] = await waitForSingle('#pay_history');
  //   if (payHistoryEl?.dataset.adpExportLoaded !== "true") {
  //     payHistoryEl.dataset.adpExportLoaded = "true";

  //     render(() => {
  //       return <Exporter store={store} setStore={setStore} settingsModal={settingsModal}></Exporter>
  //     }, payHistoryEl);

  //     let yearPanels = await waitForMultiple('.panel-heading.pay-year-head .panel-title');
  //     yearPanels.forEach((panelEl: HTMLElement) => {
  //       render(() => {
  //         return <Panel year={parseInt(panelEl.innerText)}></Panel>;
  //       }, panelEl);
  //     });
  //   }
  // };

  // setTimeout(() => {
  //   mountExporter();
  //   addEventListener("hashchange", mountExporter);
  // }, 0);

  render(() => {
    onMount(() => {
      GM_registerMenuCommand(`${GM_info.script.name} Open`, async () => {
        // console.log(await GM.getValue("adpPaystubDownloadConfig"));
        settingsModal()?.showModal();
      });
    });

    return <Main settingsModalRef={setSettingsModal} store={store} setStore={setStore} />;
  }, root);
})();