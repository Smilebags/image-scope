// @ts-ignore
const browser = browser || chrome;

let scope = null;

async function open() {
  if (!scope) {
    const { ImageScope } = await import('./ImageScope');
    scope = new ImageScope();
    await scope.init();
  }
  scope.show();
}
createListeners();

function createListeners() {
  browser.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      switch (request?.command) {
        case 'start':
          open();
          break;
        default:
          break;
      }
      sendResponse({ status: 'ok' });
    }
  );
}