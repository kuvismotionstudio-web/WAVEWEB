const { ipcRenderer } = require('electron');
document.addEventListener('mouseup', (e) => {
  if (e.button === 3 || e.button === 4) {
    ipcRenderer.sendToHost('mouse-nav', e.button);
  }
});

document.addEventListener('wheel', (e) => {
  if (!e.ctrlKey) return;
  e.preventDefault();
  e.stopPropagation();
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  ipcRenderer.sendToHost('zoom', delta);
}, { passive: false });
