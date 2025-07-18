import { Index, Show, batch, createEffect, createSignal, on, onMount, untrack } from "solid-js";
// import { saveAs } from 'file-saver';

declare global {
  interface Window {
    getAppShell: Function,
  }
}

export const exportOptions = [
  "Download CSV (separate)",
  "Download CSV (combined)",
  "Download JSON (separate)",
  "Download JSON (combined)",
  "Download PDF (separate)",
  "Download PDF (combined)",
  "Copy JSON",
  "Copy CSV",
  "Copy CSV (no header)",
];

export const defaultExportMenu = exportOptions.map((v) => {
  return {
    "title": v,
    "execute": [v],
    "enabled": true
  }
});

const copyToClipboard = (text: string) => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  } else {
    const input = document.createElement('textarea');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
  }
}

function filledArray(value: number, len: number): any[] {
  let arr = [];
  for (let i = 0; i < len; i++) {
    arr.push(value);
  }
  return arr;
}

// function downloadDataAs(data: any, contentType: string, exportName: string) {
//   let dataStr = `data:${contentType},` + encodeURIComponent(data);
//   let downloadAnchorNode = document.createElement('a');
//   downloadAnchorNode.setAttribute("href", dataStr);
//   downloadAnchorNode.setAttribute("download", exportName);
//   document.body.appendChild(downloadAnchorNode); // required for firefox
//   downloadAnchorNode.click();
//   downloadAnchorNode.remove();
// }

// function downloadAs(url: string, contentType: string, exportName: string) {
//   let downloadAnchorNode = document.createElement('a');
//   downloadAnchorNode.setAttribute("href", url);
//   downloadAnchorNode.setAttribute("download", exportName);
//   document.body.appendChild(downloadAnchorNode); // required for firefox
//   downloadAnchorNode.click();
//   downloadAnchorNode.remove();
// }

function saveAs(data: Blob | string, exportName: string) {
  let downloadAnchorNode = document.createElement('a');
  if (typeof data === "string") {
    downloadAnchorNode.setAttribute("href", data);
  } else {
    downloadAnchorNode.setAttribute("href", window.URL.createObjectURL(data));
  }
  downloadAnchorNode.setAttribute("download", exportName);
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

function jsonToCsv(data: any, mappingCfg: any): { csv: string[][], found: string[], missing: string[] } {
  let columns: Array<string> = [];
  let columnMap: any = {};
  let mapping: any = {};
  let ignored: any = {};
  let missing: any = {};
  let found: any = {};

  mappingCfg.forEach((v: any) => {
    if (!v.enabled) {
      ignored[v.key] = true;
      return true;
    }

    mapping[v.key] = v.column;
    columns.push(v.column);
  });

  for (const [index, x] of columns.entries()) {
    columnMap[x] = index;
  }

  const bucketDescriptionMap: any = {};
  data.buckets.forEach((bucket: any) => {
    bucketDescriptionMap[bucket.id] = bucket;
  });

  let results: Record<number, any>[] = [];
  for (let payment of data.payments) {
    let row: any = {};
    let otherStock: number = 0;

    [["Date", payment.date], ["From", payment.from], ["To", payment.to], ["Gross", payment.gross]].forEach(([name, value]) => {
      if (columnMap[mapping[name]] === undefined) {
        missing[name] = true;
        return;
      }

      row[columnMap[mapping[name]]] = value;
      found[name] = true;
    });

    payment.buckets.forEach((bucket: any) => {
      let bucketDescription = bucketDescriptionMap[bucket.id];
      bucket.wagetypes.forEach((wagetype: any) => {
        if (wagetype.label === "Stock Offset") {
          otherStock -= wagetype.amount;
        } else if (wagetype.label === "RSU") {
          otherStock -= wagetype.amount;
        }

        const name = bucketDescription.label + " - " + wagetype.label;
        if (ignored[name]) {
          return;
        }

        if (columnMap[mapping[name]] === undefined) {
          missing[name] = true;
          return;
        }

        row[columnMap[mapping[name]]] = wagetype.amount;
        found[name] = true;
      });
    });

    const name = "Earnings - Stock Other";
    if (otherStock > 0 && !ignored[name]) {
      if (columnMap[mapping[name]] === undefined) {
        missing[name] = true;
      } else {
        row[columnMap[mapping[name]]] = otherStock;
        found[name] = true;
      }
    }

    results.push(row);
  }

  let csvData = [columns];
  for (const result of results) {
    let d: any[] = filledArray(0, columns.length);
    for (const key in result) {
      d[key] = result[key];
    }
    csvData.push(d);
  }

  return {
    csv: csvData,
    found: Object.keys(found),
    missing: Object.keys(missing)
  };
}

export const Exporter = (props: { store: any, setStore: any, overviewData: any, selectedData: any, devKey: any }) => {
  let missingModal: any;
  let [missing, setMissing] = createSignal<string[]>([]);
  let [buttonText, setButtonText] = createSignal("Export...");
  let [scope, setScope] = createSignal<any>({});
  const [downloadCount, setDownloadCount] = createSignal(0);
  const [downloadedCount, setDownloadedCount] = createSignal(0);
  const [downloadQueue, setDownloadQueue] = createSignal<Function[]>([]);

  const exportData = async (type: string, payData: any) => {
    let name = "paydata";
    if (payData.payments.length === 1) {
      name = `Payslip_${payData.payments[0].date}`;
    } else if (payData.payments.length > 1) {
      name = `Payslip_${payData.payments[0].date}-${payData.payments[payData.payments.length - 1].date}`;
    }

    switch (type) {
      case "Download JSON (combined)": {
        setDownloadQueue(x => [...x, async () => {
          // console.log("Download " + name + ".json");          
          saveAs(new Blob([JSON.stringify(payData, null, 2)], {
            type: 'text/json;charset=utf-8'
          }), name + ".json");
          setDownloadedCount(downloadedCount() + 1);
        }]);
        setDownloadCount(downloadCount() + 1);

        break;
      }
      case "Copy JSON": {
        copyToClipboard(JSON.stringify(payData, null, 2));
        break;
      }
      case "Download CSV (combined)": {
        let { csv } = jsonToCsv(payData, props.store.settings.mapping);
        setDownloadQueue(x => [...x, async () => {
          // console.log("Download " + name + ".csv");
          saveAs(new Blob([csv.join("\n")], {
            type: 'text/csv;charset=utf-8'
          }), name + ".csv");
          setDownloadedCount(downloadedCount() + 1);
        }]);
        setDownloadCount(downloadCount() + 1);

        break;
      }
      case "Copy CSV": {
        let { csv } = jsonToCsv(payData, props.store.settings.mapping);
        copyToClipboard(csv.join("\n"));
        break;
      }
      case "Copy CSV (no header)": {
        let { csv } = jsonToCsv(payData, props.store.settings.mapping);
        csv = csv.splice(1);
        copyToClipboard(csv.join("\n"));
        break;
      }
      case "Download PDF (combined)": {
        let refs = payData.payments.map((v: any) => {
          return `${v.id}:${v.date}`;
        });

        let now = Date.now();
        let name = `pay_statements.zip`;

        let client = await window.getAppShell().getHttpClient();
        let resp = await client.get(
          `/gvservice/${props.devKey()}/payroll/payStatements/?id=${refs.join("&id=")}&celPay=`,
          { responseType: "blob" }
        );
        let blob = resp.data;

        setDownloadQueue(x => [...x, async () => {
          saveAs(blob, name);
          setDownloadedCount(downloadedCount() + 1);
        }]);
        setDownloadCount(downloadCount() + 1);

        break;
      }
      case "Download PDF (separate)": {
        let payment = payData.payments[0]
        let now = Date.now();
        let name = `Payslip_${payment.date}.pdf`;

        let client = await window.getAppShell().getHttpClient();
        let resp = await client.get(
          `/gvservice/${props.devKey()}/payroll/payStatement/${now}/images/${name}?pdfId=${payment.id}&celPay=&action=pdf&ref=${now}`,
          { responseType: "blob" }
        );
        let blob = resp.data;

        setDownloadQueue(x => [...x, async () => {
          saveAs(blob, name);
          setDownloadedCount(downloadedCount() + 1);
        }]);
        setDownloadCount(downloadCount() + 1);

        break;
      }
    }
  };

  const onClickExportData = async (payData: any, type: string) => {
    switch (type) {
      case "Download JSON (separate)": {
        payData.payments.forEach(async (payments: any[]) => {
          await exportData("Download JSON (combined)", {
            ...payData,
            payments: [payments]
          });
        });
        break;
      }
      case "Download CSV (separate)": {
        payData.payments.forEach(async (payments: any[]) => {
          await exportData("Download CSV (combined)", {
            ...payData,
            payments: [payments]
          });
        });
        break;
      }
      case "Download PDF (separate)": {
        payData.payments.forEach(async (payments: any[]) => {
          await exportData("Download PDF (separate)", {
            ...payData,
            payments: [payments]
          });
        });
        break;
      }
      default:
        await exportData(type, payData);
    }
  };

  // onMount(async () => {
  //   let $scope = angular.element(document.querySelector("#pay_history")).scope();
  //   setScope($scope);

  //   scope().$watch("selected_payment", function (newv: any, oldv: any) {
  //     let count = 1;
  //     if (Array.isArray(newv)) {
  //       count = newv.length;
  //     }
  //     setButtonText(`Export (${count})...`);
  //   });
  // });

  // createEffect(on(downloadCount, (count) => {
  //   if (count === 0) { return; }
  //   console.log("Called", downloadCount());

  //   // This avoids the limit of chrome and maybe other browsers, that you can only download
  //   // 10 things within a second otherwise it cancels all subsequent downloads.
  //   const processQueue = () => {
  //     let fn = downloadQueue.pop();
  //     if (fn) {
  //       fn();
  //       setTimeout(processQueue, 300);
  //     } else {
  //       setDownloadCount(0);
  //       setDownloadedCount(0);
  //     }
  //   };

  //   setTimeout(processQueue, 1);
  // }, { defer: true }));

  let exportButton!: HTMLDivElement;
  return (
    <div>
      {/* <div class={`tw:w-full tw:h-full tw:fixed tw:top-0 tw:left-0 tw:bg-black tw:opacity-90 tw:z-50`}>
        <div class="tw:flex tw:justify-center tw:items-center tw:mt-[40vh] tw:text-center tw:p-5">
          Solving... This could take some time and freeze.
          <span class="loading loading-spinner text-primary ml-2"></span>
        </div>
      </div> */}

      <dialog class="tw:modal" ref={missingModal}>
        <div class="tw:modal-box">
          <h3 class="tw:font-bold tw:text-lg">Missing mappings</h3>
          <p class="tw:py-4">
            There are new fields in the paystub that are missing mappings.
            Do you want to import the below mappings into your config?
          </p>
          <p class="tw:pb-4">
            To get past this dialog, please add these new mappings. You can uncheck them if you want to ignore them in the settings.
          </p>
          <div class="tw:max-h-72 tw:overflow-x-auto">
            <table class="tw:table tw:table-xs tw:table-pin-rows tw:table-pin-cols tw:mt-1">
              <thead>
                <tr>
                  <th></th>
                  <th>Key</th>
                </tr>
              </thead>
              <tbody>
                <Index each={missing()}>{(entry, i) =>
                  <tr>
                    <th>{i + 1}</th>
                    <td>
                      {entry()}
                    </td>
                  </tr>
                }</Index>
              </tbody>
            </table>
          </div>

          <div class="tw:modal-action">
            <form method="dialog">
              <div class="tw:flex tw:flex-wrap tw:items-center tw:justify-center tw:gap-2" role="group">
                <button class="tw:btn" onClick={(e) => {
                  let m = [...props.store.tmpSettings.mapping];

                  missing().forEach((key) => {
                    m.push({
                      key: key,
                      column: key,
                      enabled: true
                    });
                  });

                  props.setStore(
                    "tmpSettings", "mapping",
                    m,
                  );

                  // props.settingsModal().showModal();
                }}>Yes</button>
                <button class="tw:btn">No</button>
              </div>
            </form>
          </div>
        </div>
      </dialog>

      <div ref={exportButton} class="tw:dropdown tw:dropdown-top tw:dropdown-end">
        <div
          tabIndex={0}
          role="button"
          class="tw:btn tw:btn-secondary tw:normal-case tw:relative tw:overflow-hidden tw:border-0"
          classList={{
            "tw:btn-disabled": downloadCount() > 0 || Object.keys(props.selectedData()).length === 0
          }}
        >
          <Show when={downloadCount() > 0}>
            <div
              class="tw:absolute tw:h-full tw:top-0 tw:left-0 tw:transition-all tw:bg-primary tw:opacity-50"
              style={{
                "width": `${(downloadedCount() / downloadCount()) * 100.0}%`
              }}
            ></div>
          </Show>
          <span class="tw:z-10"><Show when={Object.keys(props.selectedData()).length} fallback="Export...">Export {Object.keys(props.selectedData()).length}...</Show></span>
        </div>
        <ul tabIndex={0} class="tw:dropdown-content tw:menu tw:bg-base-100 tw:rounded-box tw:z-1 tw:w-72 tw:p-2 tw:shadow">
          <Index each={props.store.settings.exportMenu}>{(entry, i) =>
            <li><a onClick={async (e) => {
              e.preventDefault();

              let payData = props.overviewData();

              // Check to see if we are going to do anything with CSV and if we are, check to
              // see if we have any missing mappings. We will use all the available paystubs
              // just so we find everything.
              for (let x of entry().execute) {
                if (x.match(/csv/i)) {
                  let { missing } = jsonToCsv(payData, props.store.settings.mapping);
                  if (missing.length > 0) {
                    setMissing(missing);
                    missingModal.showModal();
                    return;
                  }
                  break;
                }
              }

              let selectedMap: any = props.selectedData();
              payData.payments = payData.payments.filter((v: { id: string }) => selectedMap[v.id]);

              batch(() => {
                entry().execute.forEach(async (v: string) => {
                  await onClickExportData({ ...payData }, v);
                });
              });

              // This avoids the limit of chrome and maybe other browsers, that you can only download
              // 10 things within a second otherwise it cancels all subsequent downloads. So every interval
              // we pop something off the download queue and download it, then wait for the next interval.
              let intervalId = 0;
              let lastDownloadCount = -1;
              const processQueue = () => {
                if (lastDownloadCount === -1 || lastDownloadCount === downloadCount()) {
                  lastDownloadCount = downloadCount();
                  return;
                }

                let fn: Function = downloadQueue()[0];
                setDownloadQueue(x => {
                  return x.slice(1);
                });
                if (fn) {
                  fn();
                } else {
                  setDownloadCount(0);
                  setDownloadedCount(0);
                  clearInterval(intervalId);
                }
              };

              intervalId = setInterval(processQueue, 200);
              (document.activeElement as HTMLElement)?.blur();
            }}>{entry().title}</a></li>
          }</Index>
        </ul>
      </div>
    </div>
  );
};
