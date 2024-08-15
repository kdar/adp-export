/* @refresh reload */
import { render } from 'solid-js/web';
import { createSignal, onMount, createEffect } from 'solid-js';
import { createStore, Store, SetStoreFunction } from 'solid-js/store';

import '@/index.css';
import Settings from '@/settings';
import Exporter from '@/components/exporter';
import Panel from '@/components/panel';
import { waitFor } from '@/utils/wait';

const defaultMapping = [{
  key: "*date",
  column: "Date",
  enabled: true
}, {
  key: "*from",
  column: "FromDate",
  enabled: true
}, {
  key: "*to",
  column: "ToDate",
  enabled: true
}, {
  key: "*gross",
  column: "Gross",
  enabled: true
}];

const root = document.body;

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found.',
  );
}

function createGMStore<T extends object>(
  key: string, initState: T
): [Store<T>, SetStoreFunction<T>] {
  const [state, setState] = createStore<T>(initState);

  if (GM_getValue(key)) {
    try {
      setState(JSON.parse(GM_getValue(key)));
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
  const [store, setStore] = createGMStore('adp-export', {
    tmpMapping: defaultMapping,
    mapping: defaultMapping
  });

  const mountExporter = async () => {
    if (!/.*\/pay.*/.test(location.hash)) { return; }

    let [payHistoryEl]: HTMLElement[] = await waitFor('#pay_history');
    if (payHistoryEl?.dataset.adpExportLoaded !== "true") {
      payHistoryEl.dataset.adpExportLoaded = "true";

      render(() => {
        return <Exporter store={store} setStore={setStore} settingsModal={settingsModal}></Exporter>
      }, payHistoryEl);

      let yearPanels = await waitFor('.panel-heading.pay-year-head .panel-title');
      yearPanels.forEach((panelEl: HTMLElement) => {
        render(() => {
          return <Panel></Panel>;
        }, panelEl);
      });
    }
  };

  setTimeout(() => {
    mountExporter();
    addEventListener("hashchange", mountExporter);
  }, 0);

  render(() => {
    onMount(() => {
      GM_registerMenuCommand(`${GM_info.script.name} Settings`, async () => {
        // console.log(await GM.getValue("adpPaystubDownloadConfig"));
        settingsModal()?.showModal();
      });
    });

    return <Settings settingsModalRef={setSettingsModal} store={store} setStore={setStore} />;
  }, root);
})();