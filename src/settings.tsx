import { Index, Show, For, createSignal, createEffect, on } from "solid-js";
import { createScrollPosition } from '@solid-primitives/scroll'
import { createTimer } from '@solid-primitives/timer'
import { useMousePosition } from '@solid-primitives/mouse'

import {
  useDragDropContext,
  DragDropProvider,
  DragDropSensors,
  DragOverlay,
  SortableProvider,
  createSortable,
  closestCenter,
  DragEvent,
  transformStyle,
} from "@thisbeyond/solid-dnd";

import { merge } from "@/utils/merge";

declare module "solid-js" {
  namespace JSX {
    interface DirectiveFunctions {
      sortable: any;
    }
  }
}

const isSpecialKey = (key: string): boolean => {
  return ["*date", "*from", "*to", "*gross"].indexOf(key) !== -1;
}

const Sortable = (props: any) => {
  const sortable = createSortable(props.i);
  const [state] = useDragDropContext()!;

  const updateEntry = (idx: number, key: any, value: any) => {
    let m = [...props.store.tmpMapping];
    m[idx] = {
      ...m[idx],
      [key]: value,
    };
    props.setStore(
      "tmpMapping",
      m,
    );
  };

  const deleteEntry = (idx: number) => {
    let m = [...props.store.tmpMapping];
    m.splice(idx, 1);
    props.setStore(
      "tmpMapping",
      m,
    );
  };

  return (
    <tr
      ref={sortable.ref}
      style={transformStyle(sortable.transform)}
      classList={{
        "tw-shadow-md": sortable.isActiveDraggable,
        "tw-transition-transform tw-ease-out tw-duration-150": !!state.active.draggable,
      }}>
      <th class="tw-bg-transparent tw-p-0">
        <span {...sortable.dragActivators}>
          <svg xmlns="http://www.w3.org/2000/svg" class="tw-h-5 tw-w-5 tw-inline-block tw-opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1" /><circle cx="9" cy="5" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="19" r="1" /></svg>
        </span>
        <span>{props.i}</span>
      </th>
      <td>
        <Show when={!isSpecialKey(props.entry.key)} fallback={<span class="tw-font-bold">{props.entry.key}</span>}>
          <input
            type="text"
            placeholder="Key"
            readonly={true}
            class="!tw-input !tw-input-bordered !tw-input-sm tw-w-full"
            value={props.entry.key}
            onInput={(e: Event) => {
              let target = e.currentTarget as (HTMLInputElement | null);
              updateEntry(props.i - 1, "key", target?.value);
            }}
          />
        </Show>
      </td>
      <td>
        <input
          type="text"
          placeholder="Column"
          class="!tw-input !tw-input-bordered !tw-input-sm tw-w-full"
          value={props.entry.column}
          onInput={(e: Event) => {
            let target = e.currentTarget as (HTMLInputElement | null);
            updateEntry(props.i - 1, "column", target?.value);
          }}
        />
      </td>
      <td class="text-right">
        <div class="tw-inline-flex" role="group">
          <input
            type="checkbox"
            checked={props.entry.enabled}
            class="tw-checkbox tw-checkbox-xs tw-checkbox-primary tw-no-animation"
            onChange={(e: Event) => {
              let target = e.currentTarget as (HTMLInputElement | null);
              updateEntry(props.i - 1, "enabled", target?.checked);
            }}
          />
          <button
            class="tw-btn tw-btn-xs tw-ml-1 tw-outline-none tw-border-none"
            disabled={isSpecialKey(props.entry.key)}
            onClick={() => {
              deleteEntry(props.i - 1);
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
  );
};

const Settings = (props: { settingsModalRef: any, store: any, setStore: any }) => {
  let confirmModal: any;
  let modal: any;
  let importTextArea: any;
  const store = props.store;
  const [importError, setImportError] = createSignal<string | null>(null);
  const [activeItem, setActiveItem] = createSignal(null);

  const save = () => {
    let m = store.tmpMapping.filter((v: any) => {
      return v.key && v.key.length > 0;
    });

    props.setStore(
      "mapping",
      m,
    );
    props.setStore(
      "tmpMapping",
      m,
    );

    modal.close();
  };

  const close = () => {
    if (JSON.stringify(store.mapping) === JSON.stringify(store.tmpMapping)) {
      modal.close();
      return
    }

    confirmModal.showModal();
  };

  const confirmClose = () => {
    modal.close();
    props.setStore(
      "tmpMapping",
      store.mapping,
    );
  };

  const addEntry = () => {
    let m = [...store.tmpMapping, {
      key: "",
      column: "",
      enabled: true
    }];
    props.setStore(
      "tmpMapping",
      m,
    );
  };

  const importAndMerge = () => {
    setImportError(null);
    try {
      let m = JSON.parse(importTextArea.value);
      let merged = merge(store.tmpMapping, m, (item: any) => item.key);
      props.setStore(
        "tmpMapping",
        merged,
      );
    } catch (e: any) {
      setImportError(`Invalid format: ${e.toString()}`);
    }
  };

  const onDragStart = (e: DragEvent) => { };

  const onDragEnd = (e: DragEvent) => {
    if (e.draggable && e.droppable) {
      let fromIndex: number = e.draggable.id as number - 1;
      let toIndex: number = e.droppable.id as number - 1;
      let m = [...store.tmpMapping];

      let element = m[fromIndex];
      m.splice(fromIndex, 1);
      m.splice(toIndex, 0, element);

      props.setStore(
        "tmpMapping",
        m,
      );
    }
  };

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
        <div class="tw-modal-box tw-resize tw-max-w-[unset] tw-w-[40rem]">
          <h3 class="tw-font-bold tw-text-lg tw-relative">
            ADP Export Configuration
          </h3>

          <div role="tablist" class="tw-tabs tw-tabs-bordered">
            <input type="radio" name="my_tabs_1" role="tab" class="focus-visible:!tw-outline-none !tw-border-0 !tw-tab" aria-label="Mapping" checked={true} />
            <div role="tabpanel" class="tw-tab-content tw-pt-2">
              <div class="tw-h-96 tw-overflow-x-auto">
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
                    <DragDropProvider
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                      collisionDetector={closestCenter}
                    >
                      <DragDropSensors>

                        <SortableProvider ids={Array(store.tmpMapping.length).fill(1).map((e, i) => e + (i * 1))}>
                          <Index each={store.tmpMapping}>
                            {(entry, i) => <Sortable store={store} setStore={props.setStore} entry={entry()} i={i + 1} />}
                          </Index>
                        </SortableProvider>

                      </DragDropSensors>

                      <DragOverlay>
                        <div></div>
                      </DragOverlay>
                    </DragDropProvider>

                    <tr>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td>
                        <div class="tw-flex tw-justify-end">
                          <button
                            class="tw-btn tw-btn-xs tw-outline-none tw-border-none tw-text-lg"
                            onClick={() => {
                              addEntry();
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
              class="focus-visible:!tw-outline-none !tw-border-0 !tw-tab"
              aria-label="Import/Export" />
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
                  {JSON.stringify(store.tmpMapping)}
                </textarea>
              </label>
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
