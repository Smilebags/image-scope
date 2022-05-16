chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, { command: 'start' }, (response) => {
    console.log(response);
  });
});
