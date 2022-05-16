import { ImageScope } from './ImageScope';

// @ts-ignore
const browser = browser || chrome;

export function html<T extends Element>(strings, ...keys) {
  const htmlString = strings.map((str, index) => `${str}${keys[index] || ''}`.trim()).join('').trim();
  const doc = new DOMParser().parseFromString(htmlString, "text/html");
  return doc.children[0].children[1].children[0] as T;
}

main();

async function main() {
  const scope = new ImageScope();
  await scope.init();
  createListeners(scope);
}

function createListeners(scope: ImageScope) {
  browser.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      switch (request?.command) {
        case 'start':
          scope.show();
          break;
        default:
          break;
      }
      sendResponse({ status: 'ok' });
    }
  );
}