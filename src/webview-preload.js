const { ipcRenderer } = require('electron');
document.addEventListener('mouseup', (e) => {
  if (e.button === 3 || e.button === 4) {
    ipcRenderer.sendToHost('mouse-nav', e.button);
  }
});
