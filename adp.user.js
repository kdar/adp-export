// ==UserScript==
// @name         ADP Paystub Download
// @namespace    kdar
// @version      0.2
// @description  Downloads ADP paystub info in JSON and CSV.
// @author       Kevin Darlington
// @match        https://portal.people.adp.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @require      https://openuserjs.org/src/libs/sizzle/GM_config.js
// ==/UserScript==

let currMapping = [];
let prevMapping = [];
let buttonEl = null;
const iframecss = `
#adpPaystubDownloadConfig .config_header { 
  font-size: 15px; 
  margin: 0 0 10 0; 
} 

#adpPaystubDownloadConfig textarea { 
  width: 100%; 
  height: 200px; 
}
`;

GM_addStyle(`
.adpp-button {
  margin-left: 20px;
  background-color: #fff;
  border: 1px solid #bfbfbf;
  color: #000;
  padding: 0 calc(1.45834em - 1px);
  align-items: center;
  border-radius: 2.5em;
  cursor: pointer;
  display: inline-flex;
  font-size: .85714em;
  font-weight: 400;
  height: 2.5em;
  line-height: 2.5em;
  min-width: 3.5em;
  padding: 0 1.45833em;
  position: relative;
  text-align: center;
  text-transform: uppercase;
  touch-action: manipulation;
  margin-bottom: 20px;
}

.adpp-button:hover {
  background-color: #fff;
  border-color: var(--brand-primary-base,#39b0cd);
  color: var(--brand-primary-base,#39b0cd);
}

.adpp-preloader {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100%;
  background: rgba(23, 22, 22, 0.6);
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;
  transition: opacity 0.3s linear;
}

.adpp-input {
  font-size: 16px !important;
}

.lds-ellipsis {
  display: inline-block;
  position: relative;
  width: 80px;
  height: 80px;
}
.lds-ellipsis div {
  position: absolute;
  top: 33px;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: #fff;
  animation-timing-function: cubic-bezier(0, 1, 1, 0);
}
.lds-ellipsis div:nth-child(1) {
  left: 8px;
  animation: lds-ellipsis1 0.6s infinite;
}
.lds-ellipsis div:nth-child(2) {
  left: 8px;
  animation: lds-ellipsis2 0.6s infinite;
}
.lds-ellipsis div:nth-child(3) {
  left: 32px;
  animation: lds-ellipsis2 0.6s infinite;
}
.lds-ellipsis div:nth-child(4) {
  left: 56px;
  animation: lds-ellipsis3 0.6s infinite;
}
@keyframes lds-ellipsis1 {
  0% {
    transform: scale(0);
  }
  100% {
    transform: scale(1);
  }
}
@keyframes lds-ellipsis3 {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(0);
  }
}
@keyframes lds-ellipsis2 {
  0% {
    transform: translate(0, 0);
  }
  100% {
    transform: translate(24px, 0);
  }
}

.adpp-progress-count {
  position: absolute;
  top: 50%;
  width: 100%;
  text-align: center;
  font-weight: 100;
  font-size: 3em;
  margin-top: -1.33em;
  color: white;
}
`);

const waitFor = (...selectors) => new Promise(resolve => {
  const delay = 500;
  const f = () => {
    const elements = selectors.map(selector => document.querySelector(selector));
    if (elements.every(element => element !== null)) {
      resolve(elements);
    } else {
      setTimeout(f, delay);
    }
  }
  f();
})

function downloadAs(data, contentType, exportName) {
  let dataStr = `data:${contentType},` + encodeURIComponent(data);
  let downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", exportName);
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

function downloadObjectAsJson(exportObj, exportName) {
  downloadAs(JSON.stringify(exportObj, null, 2), "text/json;charset=utf-8", exportName + ".json");
}

function downloadTextAsCSV(text, exportName) {
  downloadAs(text, "text/csv;charset=utf-8", exportName + ".csv");
}

function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

async function getJsonData() {
  // const company = document.querySelector("div[adp-mini-me]").attributes["data-url"].value.split("/")[2];
  // let res = await fetch(`https://portal.people.adp.com/gvservice/${company}/ess/pay/overview?gvCountry=US&payDetailsLazyLoading=X&celPay=`, {
  //   "headers": {
  //     "accept": "application/json, text/plain, */*",
  //     "accept-language": "en-US,en;q=0.9",
  //     "cache-control": "no-cache",
  //     "pragma": "no-cache",
  //     "sec-ch-ua": "\"Chromium\";v=\"122\", \"Not(A:Brand\";v=\"24\", \"Google Chrome\";v=\"122\"",
  //     "sec-ch-ua-mobile": "?0",
  //     "sec-ch-ua-platform": "\"Windows\"",
  //     "sec-fetch-dest": "empty",
  //     "sec-fetch-mode": "cors",
  //     "sec-fetch-site": "same-origin",
  //     "sec-gpc": "1"
  //   },
  //   "referrer": "https://portal.people.adp.com/gvfrmwk3/landing.html",
  //   "referrerPolicy": "strict-origin-when-cross-origin",
  //   "body": null,
  //   "method": "GET",
  //   "mode": "cors",
  //   "credentials": "include"
  // });


  // let payData = await res.json();
  // return payData;

  let $root = angular.element(document.querySelector("#pay_history")).scope().$parent;

  return {
    "buckets": $root.buckets,
    "payments": $root.payStatements.map((v) => {
      if (v.date.toISOString) {
        let parts = v.date.toISOString().split("T");
        v.date = parts[0];
      }
      return v;
    }),
  };
}

function filledArray(value, len) {
  let arr = [];
  for (let i = 0; i < len; i++) {
    arr.push(value);
  }
  return arr;
}

function jsonToCsv(data) {
  let rawMapping = Array.from(GM_config.get('mapping').split("\n")).map((x) => {
    return x.trim();
  });

  let columns = [];
  let columnMap = {};
  let mapping = {};
  let ignored = {};
  rawMapping.forEach((v) => {
    let parts = v.split("=");
    if (parts[1] == "-") {
      ignored[parts[0]] = true;
      return;
    }

    mapping[parts[0]] = parts[1];
    columns.push(parts[1]);
  });

  for (const [index, x] of columns.entries()) {
    columnMap[x] = index;
  }

  const bucketDescriptionMap = {};
  data.buckets.forEach((bucket) => {
    bucketDescriptionMap[bucket.id] = bucket;
  });

  let results = [];
  let errors = {};
  for (let payment of data.payments) {
    let d = {};

    d[columnMap[mapping["*date"]]] = payment.date;
    d[columnMap[mapping["*from"]]] = payment.from;
    d[columnMap[mapping["*to"]]] = payment.to;
    d[columnMap[mapping["*gross"]]] = payment.gross;

    payment.buckets.forEach((bucket) => {
      bucketDescription = bucketDescriptionMap[bucket.id];
      bucket.wagetypes.forEach((wagetype) => {
        const name = bucketDescription.label + " - " + wagetype.label;
        if (ignored[name]) {
          return;
        }

        if (columnMap[mapping[name]] === undefined) {
          errors[`Missing "${name}" in mapping config. Please add it.`] = true;
          return;
        }
        d[columnMap[mapping[name]]] = wagetype.amount;
      });
    });

    results.push(d);
  }

  let csvData = [columns];
  for (const result of results) {
    let d = filledArray(0, columns.length);
    for (const key in result) {
      d[key] = result[key];
    }
    csvData.push(d);
  }

  if (Object.keys(errors).length > 0) {
    alert(Object.keys(errors).join("\n"));
  }

  return csvData;
}

async function downloadData() {
  let selected = angular.element(document.querySelector("#pay_history")).scope().$parent.getSelected();
  let selectedMap = {};
  selected.forEach((v) => {
    selectedMap[v.id] = true;
  });

  let spinnerEl = document.createElement("div");
  spinnerEl.className = "adpp-preloader";
  spinnerEl.innerHTML = `
    <div class="lds-ellipsis">
      <div></div><div></div><div></div><div></div>
    </div>
    <h1 class="adpp-progress-count"></h1>
  `;
  document.body.appendChild(spinnerEl);

  let payData = await getJsonData();
  payData.payments = payData.payments.filter((v) => selectedMap[v.id]);

  let name = "paydata";
  if (payData.payments.length === 1) {
    name = `Payslip_${payData.payments[0].date}`;
  } else if (payData.payments.length > 1) {
    name = `Payslip_${payData.payments[0].date}-${payData.payments[payData.payments.length - 1].date}`;
  }

  downloadObjectAsJson(payData, name);
  let csv = jsonToCsv(payData);
  navigator.clipboard.writeText(csv.slice(1).join("\n")).then(function () { }, function (err) {
    console.error('Could not copy text to clipboard: ', err);
  });
  downloadTextAsCSV(csv.join("\n"), name);
  document.body.removeChild(spinnerEl);
}

function ready(fn) {
  if (document.readyState != 'loading') {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

async function main() {
  if (!/.*\/pay.*/.test(location.hash)) return;

  let [payHistoryEl] = await waitFor('#pay_history');
  buttonEl = document.createElement("button");
  buttonEl.innerText = "Download JSON/CSV";
  buttonEl.className = "btn btn-primary";
  buttonEl.onclick = downloadData;
  buttonEl.style = "text-transform: none; margin-top: 10px;"
  payHistoryEl.appendChild(buttonEl);

  let $scope = angular.element(document.querySelector("#pay_history")).scope();

  $scope.$watch("selected_payment", function (newv, oldv) {
    let count = 1;
    if (Array.isArray(newv)) {
      count = newv.length;
    }
    buttonEl.innerText = `Download JSON/CSV (${count})`;
  });

  let yearPanels = await waitFor('.panel-heading.pay-year-head .panel-title');
  yearPanels.forEach((panelEl) => {
    let year = panelEl.querySelector(".panel-title-name").innerText;
    // let el = document.createElement("adp-checkbox");
    // el.name = `check_all_${year}`;
    // el.className = "ng-pristine ng-untouched ng-valid ng-isolate-scope ng-not-empty";

    // let inputEl = document.createElement("input");
    // inputEl.type = "checkbox";
    // inputEl.className = "checkboxCls ng-pristine ng-untouched ng-valid ng-not-empty ng-valid-required adp-checkbox";
    // el.appendChild(inputEl);

    // let labelEl = document.createElement("label");
    // el.appendChild(labelEl);

    let el = document.createElement("a");
    el.href = "#";
    el.innerText = "Toggle all";
    el.className = "h6";
    el.dataset.state = "0";
    el.onclick = (e) => {
      let selected;
      if (el.dataset.state === "0") {
        selected = true;
        el.dataset.state = "1";
      } else {
        selected = false;
        el.dataset.state = "0";
      }

      for (let x = 0; x < $scope.payStatements.length; x++) {
        $scope.payStatements[x].selected = selected;
      }

      e.preventDefault();
      return false;
    };

    panelEl.appendChild(el);
  });
}

(async () => {
  'use strict';

  GM_registerMenuCommand(`${GM_info.script.name} Settings`, () => {
    GM_config.open();
  });

  GM_config.init(
    {
      'id': 'adpPaystubDownloadConfig',
      'title': 'Configure ADP Paystub Download',
      'fields':
      {
        'mapping':
        {
          'label': 'Mapping',
          'type': 'textarea',
          'default': ''
        }
      },
      'events':
      {
        'init': function () {
          currMapping = GM_config.get('mapping');
        },
        'open': function () {
          // custom layout
          let config_ui = this.frame;
          config_ui.style.height = '';
          config_ui.style.margin = 'auto';
          config_ui.style.width = '30%';
          config_ui.style.height = '50%';
          config_ui.style.left = '40%';
          GM_config.fields['mapping'].node.value = currMapping;

          GM_config.fields['mapping'].node.addEventListener('change', function () {
            currMapping = GM_config.fields['mapping'].toValue();
          }, false);
          GM_config.fields['mapping'].node.addEventListener('focus', function () {
            prevMapping = GM_config.fields['mapping'].toValue();
          }, false);
        },
        'save': function () {
          if (prevMapping !== currMapping) {
            location.reload();
          }
        }
      },
      'css': iframecss
    });

  ready(main);
  window.addEventListener("hashchange", main, false);
})();