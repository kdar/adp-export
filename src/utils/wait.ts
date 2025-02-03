export const waitForSingle = (...selectors: any[]): any => new Promise(resolve => {
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
});

export const waitForMultiple = (selector: any): any => new Promise(resolve => {
  const delay = 1500;
  let lastCount = 0;
  const f = () => {
    const elements = Array.from(document.querySelectorAll(selector));
    if (elements.every(element => element !== null) && elements.length === lastCount) {
      resolve(elements);
    } else {
      lastCount = elements.length;
      setTimeout(f, delay);
    }
  }
  setTimeout(f, delay);
});
