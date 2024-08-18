import { Index, createSignal, onMount } from "solid-js";

declare var angular: any;

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

function downloadAs(data: any, contentType: string, exportName: string) {
  let dataStr = `data:${contentType},` + encodeURIComponent(data);
  let downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", exportName);
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

function downloadObjectAsJson(exportObj: any, exportName: string) {
  downloadAs(JSON.stringify(exportObj, null, 2), "text/json;charset=utf-8", exportName + ".json");
}

function downloadTextAsCSV(text: string, exportName: string) {
  downloadAs(text, "text/csv;charset=utf-8", exportName + ".csv");
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

async function getJsonData(scope: any) {
  const j = {
    "buckets": scope.buckets,
    "payments": scope.payStatements.map((v: any) => {
      if (v.date.toISOString) {
        let parts = v.date.toISOString().split("T");
        v.date = parts[0];
      }
      return v;
    }),
  };

  // Gets rid of angular specific keys, like $$hashKey.
  return JSON.parse(angular.toJson(j));
}

const Exporter = (props: any) => {
  let missingModal: any;
  let [missing, setMissing] = createSignal<string[]>([]);
  let [buttonText, setButtonText] = createSignal("Export");
  let [scope, setScope] = createSignal<any>({});

  const exportData = async (type: string, payData: any) => {
    let name = "paydata";
    if (payData.payments.length === 1) {
      name = `Payslip_${payData.payments[0].date}`;
    } else if (payData.payments.length > 1) {
      name = `Payslip_${payData.payments[0].date}-${payData.payments[payData.payments.length - 1].date}`;
    }

    switch (type) {
      case "download_json": {
        downloadObjectAsJson(payData, name);
        break;
      }
      case "copy_json": {
        copyToClipboard(JSON.stringify(payData, null, 2));
        break;
      }
      case "download_csv": {
        let { csv, missing } = jsonToCsv(payData, props.store.mapping);
        downloadTextAsCSV(csv.join("\n"), name);
        if (missing.length > 0) {
          setMissing(missing);
          missingModal.showModal();
        }
        break;
      }
      case "copy_csv": {
        let { csv, missing } = jsonToCsv(payData, props.store.mapping);
        copyToClipboard(csv.join("\n"));
        if (missing.length > 0) {
          setMissing(missing);
          missingModal.showModal();
        }
        break;
      }
    }
  };

  const onClickExportData = async (type: string) => {
    let selected = scope().getSelected();
    let payData = await getJsonData(scope());
    let selectedMap: any = {};
    selected.forEach((v: { id: string }) => {
      selectedMap[v.id] = true;
    });
    payData.payments = payData.payments.filter((v: { id: string }) => selectedMap[v.id]);

    switch (type) {
      case "download_json_multiple": {
        const storedPayments = payData.payments;
        storedPayments.forEach((payments: any[]) => {
          payData.payments = [payments];
          exportData("download_json", payData);
        });
        break;
      }
      case "download_csv_multiple": {
        const storedPayments = payData.payments;
        storedPayments.forEach((payments: any[]) => {
          payData.payments = [payments];
          exportData("download_csv", payData);
        });
        break;
      }
      default:
        exportData(type, payData);
    }
  };

  onMount(async () => {
    let $scope = angular.element(document.querySelector("#pay_history")).scope();
    setScope($scope);

    scope().$watch("selected_payment", function (newv: any, oldv: any) {
      let count = 1;
      if (Array.isArray(newv)) {
        count = newv.length;
      }
      setButtonText(`Export (${count})`);
    });
  });

  let exportButton!: HTMLDivElement;
  return (
    <div>
      <dialog class="tw-modal" ref={missingModal}>
        <div class="tw-modal-box">
          <h3 class="tw-font-bold tw-text-lg">Missing mappings</h3>
          <p class="tw-py-4">There are new fields in the paystub that are missing mappings. Do you want to import the below mappings into your config?</p>

          <div class="tw-max-h-72 tw-overflow-x-auto">
            <table class="tw-table tw-table-xs tw-table-pin-rows tw-table-pin-cols tw-mt-1">
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

          <div class="tw-modal-action">
            <form method="dialog">
              <div class="tw-flex tw-flex-wrap tw-items-center tw-justify-center tw-gap-2" role="group">
                <button class="tw-btn" onClick={(e) => {
                  let m = [...props.store.tmpMapping];

                  missing().forEach((key) => {
                    m.push({
                      key: key,
                      column: key,
                      enabled: true
                    });
                  });

                  props.setStore(
                    "tmpMapping",
                    m,
                  );

                  props.settingsModal().showModal();
                }}>Yes</button>
                <button class="tw-btn">No</button>
              </div>
            </form>
          </div>
        </div>
      </dialog>

      <div ref={exportButton} class="tw-dropdown tw-dropdown-top">
        <div tabIndex={0} role="button" class="tw-btn tw-btn-primary tw-mt-2 tw-normal-case">{buttonText()}</div>
        <ul tabIndex={0} class="tw-dropdown-content tw-menu tw-bg-base-100 tw-rounded-box tw-z-[1] tw-w-72 tw-p-2 tw-shadow">
          <li><a onClick={async (e) => {
            e.preventDefault();
            await onClickExportData("download_json");
            (document.activeElement as HTMLElement)?.blur();
          }}>Download JSON (combined)</a></li>
          <li><a onClick={async (e) => {
            e.preventDefault();
            await onClickExportData("download_json_multiple");
            (document.activeElement as HTMLElement)?.blur();
          }}>Download JSON (multiple files)</a></li>
          <li><a onClick={async (e) => {
            e.preventDefault();
            await onClickExportData("download_csv");
            (document.activeElement as HTMLElement)?.blur();
          }}>Download CSV  (combined)</a></li>
          <li><a onClick={async (e) => {
            e.preventDefault();
            await onClickExportData("download_csv_multiple");
            (document.activeElement as HTMLElement)?.blur();
          }}>Download CSV  (multiple files)</a></li>
          <li><a onClick={async (e) => {
            e.preventDefault();
            await onClickExportData("copy_json");
            (document.activeElement as HTMLElement)?.blur();
          }}>Copy JSON</a></li>
          <li><a onClick={async (e) => {
            e.preventDefault();
            await onClickExportData("copy_csv");
            (document.activeElement as HTMLElement)?.blur();
          }}>Copy CSV</a></li>
        </ul>
      </div>
    </div>
  );
};

export default Exporter;
