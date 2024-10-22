import { Index, Show, For, createSignal, createEffect, on, batch, onMount, onCleanup } from "solid-js";
import {
  attachClosestEdge,
  extractClosestEdge,
  type Edge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import {
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { pointerOutsideOfPreview } from '@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { GripVertical } from 'lucide-solid';
import { Portal } from 'solid-js/web';
import { DropIndicator } from '@/drop-indicator';
import { triggerPostMoveFlash } from '@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash';
import { reorderWithEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import invariant from 'tiny-invariant';
import { Select, createOptions } from "@thisbeyond/solid-select";

// DND taken from: https://atlassian.design/components/pragmatic-drag-and-drop/examples

import { merge } from "@/utils/merge";
import { exportOptions, defaultExportMenu } from "@/components/exporter";

import "@thisbeyond/solid-select/style.css";
import "./settings.css";

declare module "solid-js" {
  namespace JSX {
    interface DirectiveFunctions {
      sortable: any;
    }
  }
}

// Type narrowing is tricky with Solid's signal accessors
interface ItemState {
  type: 'idle' | 'preview' | 'is-dragging' | 'is-dragging-over';
  container?: HTMLElement;
  closestEdge?: Edge | null;
}

const idle: ItemState = { type: 'idle' };

type MappingItem = {
  key: string,
  column: string,
  enabled: boolean,
};

const MappingTableItem = (props: { store: any, setStore: any, item: MappingItem, id: number }) => {
  let ref: HTMLTableRowElement | undefined = undefined;
  let handleRef: HTMLDivElement | undefined = undefined;
  const [state, setState] = createSignal<ItemState>(idle);

  const updateEntry = (idx: number, key: any, value: any) => {
    let m = [...props.store.tmpSettings.mapping];
    m[idx] = {
      ...m[idx],
      [key]: value,
    };
    props.setStore(
      "tmpSettings", "mapping",
      m,
    );
  };

  const deleteEntry = (idx: number) => {
    let m = [...props.store.tmpSettings.mapping];
    m.splice(idx, 1);
    props.setStore(
      "tmpSettings", "mapping",
      m,
    );
  };

  createEffect(() => {
    const element = ref;
    const item = props.item;
    invariant(element);
    const dragHandle = handleRef;
    invariant(dragHandle);

    draggable({
      element: dragHandle,
      getInitialData() {
        return {
          id: props.id,
          dnd: true,
          type: "mapping"
        };
      },
      onGenerateDragPreview({ nativeSetDragImage }) {
        setCustomNativeDragPreview({
          nativeSetDragImage,
          getOffset: pointerOutsideOfPreview({
            x: '16px',
            y: '8px',
          }),
          render({ container }) {
            setState({ type: 'preview', container });
          },
        });
      },
      onDragStart() {
        setState({ type: 'is-dragging' });
      },
      onDrop() {
        setState(idle);
      },
    });

    dropTargetForElements({
      element,
      canDrop({ source }) {
        // not allowing dropping on yourself
        if (source.element === element) {
          return false;
        }

        // only allowing items to be dropped on me
        return !!source.data.dnd;
      },
      getData({ input }) {
        const data = {
          id: props.id,
          dnd: true,
          type: "mapping"
        };
        return attachClosestEdge(data, {
          element,
          input,
          allowedEdges: ['top', 'bottom'],
        });
      },
      getIsSticky() {
        return true;
      },
      onDragEnter({ self }) {
        const closestEdge = extractClosestEdge(self.data);
        setState({ type: 'is-dragging-over', closestEdge });
      },
      onDrag({ self }) {
        const closestEdge = extractClosestEdge(self.data);

        // Only need to update state if nothing has changed.
        // Prevents re-rendering.
        setState((current) => {
          if (current.type === 'is-dragging-over' && current.closestEdge === closestEdge) {
            return current;
          }
          return { type: 'is-dragging-over', closestEdge };
        });
      },
      onDragLeave() {
        setState(idle);
      },
      onDrop() {
        setState(idle);
      },
    });
  });

  return <>
    {state().type === 'is-dragging-over' && state().closestEdge === "top" ?
      <tr class="tw-absolute tw-w-full tw-border-0"><td class="tw-w-full"><DropIndicator edge={"top"} gap={'0px'}></DropIndicator></td></tr> : null
    }
    <tr ref={ref} classList={{
      "tw-opacity-50": state().type === "is-dragging"
    }}>
      <th class="tw-bg-transparent tw-p-0">
        <span ref={handleRef}>
          <GripVertical size={10} class="tw-h-5 tw-w-5 tw-inline-block tw-opacity-50" />
        </span>
        <span>{props.id}</span>
      </th>
      <td>
        <input
          type="text"
          placeholder="Key"
          class="!tw-input !tw-input-bordered !tw-input-sm tw-w-full"
          value={props.item.key}
          onInput={(e: Event) => {
            let target = e.currentTarget as (HTMLInputElement | null);
            updateEntry(props.id - 1, "key", target?.value);
          }}
        />
      </td>
      <td>
        <input
          type="text"
          placeholder="Column"
          class="!tw-input !tw-input-bordered !tw-input-sm tw-w-full"
          value={props.item.column}
          onInput={(e: Event) => {
            let target = e.currentTarget as (HTMLInputElement | null);
            updateEntry(props.id - 1, "column", target?.value);
          }}
        />
      </td>
      <td class="text-right">
        <div class="tw-inline-flex" role="group">
          <input
            type="checkbox"
            checked={props.item.enabled}
            class="tw-checkbox tw-checkbox-xs tw-checkbox-primary tw-no-animation"
            onChange={(e: Event) => {
              let target = e.currentTarget as (HTMLInputElement | null);
              updateEntry(props.id - 1, "enabled", target?.checked);
            }}
          />
          <button
            class="tw-btn tw-btn-xs tw-ml-1 tw-outline-none tw-border-none"
            onClick={() => {
              deleteEntry(props.id - 1);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="tw-h-3 tw-w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
    {state().type === 'is-dragging-over' && state().closestEdge === "bottom" ?
      <tr class="tw-absolute tw-w-full tw-border-0"><td class="tw-w-full"><DropIndicator edge={"top"} gap={'0px'}></DropIndicator></td></tr> : null
    }
    {state().type === 'preview' ? (
      <Portal mount={state().container}>
        <div class="border-solid rounded p-2 bg-white">{props.item.key} {"=>"} {props.item.column}</div>
      </Portal>
    ) : null}
  </>;
};

type MenuItem = {
  title: string,
  execute: string[],
  enabled: boolean,
};

const MenuTableItem = (props: { store: any, setStore: any, item: MenuItem, id: number }) => {
  let ref: HTMLTableRowElement | undefined = undefined;
  let handleRef: HTMLDivElement | undefined = undefined;
  const [state, setState] = createSignal<ItemState>(idle);

  const updateEntry = (idx: number, key: any, value: any) => {
    let m = [...props.store.tmpSettings.exportMenu];
    m[idx] = {
      ...m[idx],
      [key]: value,
    };
    props.setStore(
      "tmpSettings", "exportMenu",
      m,
    );
  };

  const deleteEntry = (idx: number) => {
    let m = [...props.store.tmpSettings.exportMenu];
    m.splice(idx, 1);
    props.setStore(
      "tmpSettings", "exportMenu",
      m,
    );
  };

  createEffect(() => {
    const element = ref;
    const item = props.item;
    invariant(element);
    const dragHandle = handleRef;
    invariant(dragHandle);

    draggable({
      element: dragHandle,
      getInitialData() {
        return {
          id: props.id,
          dnd: true,
          type: "exportMenu"
        };
      },
      onGenerateDragPreview({ nativeSetDragImage }) {
        setCustomNativeDragPreview({
          nativeSetDragImage,
          getOffset: pointerOutsideOfPreview({
            x: '16px',
            y: '8px',
          }),
          render({ container }) {
            setState({ type: 'preview', container });
          },
        });
      },
      onDragStart() {
        setState({ type: 'is-dragging' });
      },
      onDrop() {
        setState(idle);
      },
    });

    dropTargetForElements({
      element,
      canDrop({ source }) {
        // not allowing dropping on yourself
        if (source.element === element) {
          return false;
        }

        // only allowing items to be dropped on me
        return !!source.data.dnd;
      },
      getData({ input }) {
        const data = {
          id: props.id,
          dnd: true,
          type: "exportMenu"
        };
        return attachClosestEdge(data, {
          element,
          input,
          allowedEdges: ['top', 'bottom'],
        });
      },
      getIsSticky() {
        return true;
      },
      onDragEnter({ self }) {
        const closestEdge = extractClosestEdge(self.data);
        setState({ type: 'is-dragging-over', closestEdge });
      },
      onDrag({ self }) {
        const closestEdge = extractClosestEdge(self.data);

        // Only need to update state if nothing has changed.
        // Prevents re-rendering.
        setState((current) => {
          if (current.type === 'is-dragging-over' && current.closestEdge === closestEdge) {
            return current;
          }
          return { type: 'is-dragging-over', closestEdge };
        });
      },
      onDragLeave() {
        setState(idle);
      },
      onDrop() {
        setState(idle);
      },
    });
  });

  return <>
    {state().type === 'is-dragging-over' && state().closestEdge === "top" ?
      <tr class="tw-absolute tw-w-full tw-border-0"><td class="tw-w-full"><DropIndicator edge={"top"} gap={'0px'}></DropIndicator></td></tr> : null
    }
    <tr ref={ref} classList={{
      "tw-opacity-50": state().type === "is-dragging"
    }}>
      <th class="tw-bg-transparent tw-p-0 tw-w-0">
        <div class="tw-inline-flex" role="group">
          <span ref={handleRef}>
            <GripVertical size={10} class="tw-h-5 tw-w-5 tw-inline-block tw-opacity-50" />
          </span>
          <span>{props.id}</span>
        </div>
      </th>
      <td>
        <input
          type="text"
          placeholder="Title"
          class="!tw-input !tw-input-bordered !tw-input-sm"
          value={props.item.title || ""}
          onInput={(e: Event) => {
            let target = e.currentTarget as (HTMLInputElement | null);
            updateEntry(props.id - 1, "title", target?.value);
          }}
        />
      </td>
      <td class="tw-max-w-60">
        <Select
          multiple
          {...createOptions(exportOptions)}
          initialValue={props.item.execute || []}
          onChange={(v) => {
            updateEntry(props.id - 1, "execute", v);
          }}
        />
      </td>
      <td class="text-right tw-w-0">
        <div class="tw-inline-flex" role="group">
          <input
            type="checkbox"
            checked={props.item.enabled}
            class="tw-checkbox tw-checkbox-xs tw-checkbox-primary tw-no-animation"
            onChange={(e: Event) => {
              let target = e.currentTarget as (HTMLInputElement | null);
              updateEntry(props.id - 1, "enabled", target?.checked);
            }}
          />
          <button
            class="tw-btn tw-btn-xs tw-ml-1 tw-outline-none tw-border-none"
            onClick={() => {
              deleteEntry(props.id - 1);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="tw-h-3 tw-w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </td>
    </tr >
    {
      state().type === 'is-dragging-over' && state().closestEdge === "bottom" ?
        <tr class="tw-absolute tw-w-full tw-border-0"><td class="tw-w-full"><DropIndicator edge={"top"} gap={'0px'}></DropIndicator></td></tr> : null
    }
    {
      state().type === 'preview' ? (
        <Portal mount={state().container}>
          <div class="border-solid rounded p-2 bg-white">{props.item.title}</div>
        </Portal>
      ) : null
    }
  </>;
};

const Settings = (props: { settingsModalRef: any, store: any, setStore: any }) => {
  let confirmModal: any;
  let modal!: HTMLDialogElement;
  let modalResizeEl!: HTMLDivElement;
  let importTextArea: any;
  const store = props.store;
  const [importError, setImportError] = createSignal<string | null>(null);

  const save = () => {
    let mappings = store.tmpSettings.mapping.filter((v: any) => {
      return v.key && v.key.length > 0;
    });

    let menu = store.tmpSettings.exportMenu.filter((v: any) => {
      return v.title && v.title.length > 0;
    });

    batch(() => {
      props.setStore(
        "settings", "mapping",
        mappings,
      );
      props.setStore(
        "tmpSettings", "mapping",
        mappings,
      );

      props.setStore(
        "settings", "exportMenu",
        menu,
      );
      props.setStore(
        "tmpSettings", "exportMenu",
        menu,
      );
    });

    modal.close();
  };

  const close = () => {
    if (JSON.stringify(store.tmpSettings) === JSON.stringify(store.settings)) {
      modal.close();
      return
    }

    confirmModal.showModal();
  };

  const confirmClose = () => {
    modal.close();
    props.setStore(
      "tmpSettings", "mapping",
      store.settings.mapping,
    );
  };

  const addMappingEntry = () => {
    let m = [...store.tmpSettings.mapping, {
      key: "",
      column: "",
      enabled: true
    }];
    props.setStore(
      "tmpSettings", "mapping",
      m,
    );
  };

  const addMenuEntry = () => {
    let m = [...store.tmpSettings.exportMenu, {
      name: "",
      execute: "",
      enabled: true
    }];
    props.setStore(
      "tmpSettings", "exportMenu",
      m,
    );
  };

  const importAndMerge = () => {
    setImportError(null);
    try {
      let m = JSON.parse(importTextArea.value);
      let merged = merge(store.tmpSettings.mapping, m, (item: any) => item.key);
      props.setStore(
        "tmpSettings", "mapping",
        merged,
      );
    } catch (e: any) {
      setImportError(`Invalid format: ${e.toString()}`);
    }
  };

  createEffect(() => {
    return monitorForElements({
      canMonitor({ source }) {
        return !!source.data.dnd;
      },
      onDrop({ location, source }) {
        const target = location.current.dropTargets[0];
        if (!target) {
          return;
        }

        const sourceData = source.data;
        const targetData = target.data;
        if (!!!sourceData.dnd || !!!targetData.dnd) {
          return;
        }

        const closestEdgeOfTarget = extractClosestEdge(targetData);
        switch (sourceData.type) {
          case "mapping": {
            props.setStore(
              "tmpSettings", "mapping",
              reorderWithEdge({
                list: store.tmpSettings.mapping,
                startIndex: sourceData.id as number - 1,
                indexOfTarget: targetData.id as number - 1,
                closestEdgeOfTarget,
                axis: 'vertical',
              })
            );
            break;
          }
          case "exportMenu": {
            props.setStore(
              "tmpSettings", "exportMenu",
              reorderWithEdge({
                list: store.tmpSettings.exportMenu,
                startIndex: sourceData.id as number - 1,
                indexOfTarget: targetData.id as number - 1,
                closestEdgeOfTarget,
                axis: 'vertical',
              })
            );
            break;
          }
        }
      },
    });
  });

  createEffect(() => {
    modal.addEventListener("close", () => {
      batch(() => {
        props.setStore("settingsDialogWidth", modalResizeEl.clientWidth);
        props.setStore("settingsDialogHeight", modalResizeEl.clientHeight);
      });
    });
  });

  onMount(() => {
    if (props.store.settingsDialogWidth) {
      modalResizeEl.style.width = `${props.store.settingsDialogWidth}px`;
      modalResizeEl.style.height = `${props.store.settingsDialogHeight}px`;
    }
  });

  return (
    <div id="adp-export-app">
      <dialog class="tw-modal" ref={confirmModal}>
        <div class="tw-modal-box">
          <h3 class="tw-font-bold tw-text-lg">Confirm</h3>
          <p class="tw-py-4">You have unsaved changes. Close anyway?</p>
          <div class="tw-modal-action">
            <form method="dialog">
              <div class="tw-flex tw-flex-wrap tw-items-center tw-justify-center tw-gap-2" role="group">
                <button class="tw-btn" onClick={(e) => confirmClose()}>Yes</button>
                <button class="tw-btn">No</button>
              </div>
            </form>
          </div>
        </div>
      </dialog>

      <dialog ref={(e) => {
        modal = e;
        props.settingsModalRef(e);
      }} class="tw-modal">
        <div ref={modalResizeEl} class="tw-modal-box tw-resize tw-max-w-[unset]">
          <h3 class="tw-font-bold tw-text-lg tw-relative">
            ADP Export Configuration
          </h3>

          <div role="tablist" class="tw-tabs tw-tabs-bordered">
            <input type="radio" name="my_tabs_1" role="tab" class="focus-visible:!tw-outline-none !tw-border-0 !tw-tab tw-whitespace-nowrap" aria-label="Column Mapping" checked={true} />
            <div role="tabpanel" class="tw-tab-content tw-pt-2">
              <div class="tw-overflow-auto">
                <table class="tw-table tw-table-sm tw-table-pin-rows tw-table-pin-cols tw-mt-1">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Key</th>
                      <th>Column</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <Index each={store.tmpSettings.mapping}>
                      {(item, i) => <MappingTableItem store={store} setStore={props.setStore} item={item()} id={i + 1} />}
                    </Index>

                    <tr>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td>
                        <div class="tw-flex tw-justify-end">
                          <button
                            class="tw-btn tw-btn-xs tw-outline-none tw-border-none tw-text-lg"
                            onClick={() => {
                              addMappingEntry();
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" class="tw-h-3 tw-w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <input
              type="radio"
              name="my_tabs_1"
              role="tab"
              class="focus-visible:!tw-outline-none !tw-border-0 !tw-tab tw-whitespace-nowrap"
              aria-label="Column Import/Export" />
            <div role="tabpanel" class="tw-tab-content tw-pt-2">
              <label class="tw-form-control tw-w-full">
                <div class="tw-label">
                  <span class="tw-label-text">Import</span>
                </div>
                <textarea
                  ref={importTextArea}
                  class="tw-textarea tw-textarea-bordered tw-leading-none tw-font-normal tw-p-2 tw-h-36"
                  spellcheck={false}
                ></textarea>
              </label>

              <Show when={importError()}>
                <span class="tw-mt-2 tw-text-sm tw-text-red-500 tw-peer-[&:not(:placeholder-shown):not(:focus):invalid]:block">
                  {importError()}
                </span>
              </Show>

              <div class="tw-modal-action tw-mt-1">
                <div class="tw-flex tw-flex-wrap tw-items-center tw-justify-center tw-gap-2" role="group">
                  <button class="tw-btn tw-btn-accent tw-no-animation" onClick={(e) => {
                    importAndMerge();
                  }}>Import and Merge</button>
                </div>
              </div>

              <label class="tw-form-control tw-w-full">
                <div class="tw-label">
                  <span class="tw-label-text">Export (automaticly updated)</span>
                </div>
                <textarea
                  class="tw-textarea tw-textarea-bordered tw-leading-none tw-font-normal tw-p-2 tw-h-36"
                  spellcheck={false}
                >
                  {JSON.stringify(store.tmpSettings.mapping)}
                </textarea>
              </label>
            </div>

            <input type="radio" name="my_tabs_1" role="tab" class="focus-visible:!tw-outline-none !tw-border-0 !tw-tab tw-whitespace-nowrap" aria-label="Menu" />
            <div role="tabpanel" class="tw-tab-content tw-pt-2">
              <div class="tw-h-96 tw-overflow-x-auto">
                <table class="tw-table tw-table-sm tw-table-pin-rows tw-table-pin-cols tw-mt-1 tw-table-auto">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Menu item</th>
                      <th>Execute</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <Index each={store.tmpSettings.exportMenu}>
                      {(item, i) => <MenuTableItem store={store} setStore={props.setStore} item={item()} id={i + 1} />}
                    </Index>

                    <tr>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td>
                        <div class="tw-flex tw-justify-end">
                          <button
                            class="tw-btn tw-btn-xs tw-outline-none tw-border-none tw-text-lg"
                            onClick={() => {
                              addMenuEntry();
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" class="tw-h-3 tw-w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="tw-modal-action tw-mt-1">
            <div class="tw-flex tw-flex-wrap tw-items-center tw-justify-center tw-gap-2" role="group">
              <button class="tw-btn tw-btn-primary" onClick={(e) => {
                save();
              }}>Save</button>
              <button class="tw-btn" onClick={(e) => {
                close();
              }}>Close</button>
            </div>
          </div>
        </div>
      </dialog>
    </div>
  );
};

export default Settings;