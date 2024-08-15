export const waitFor = (...selectors: any[]): any => new Promise(resolve => {
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