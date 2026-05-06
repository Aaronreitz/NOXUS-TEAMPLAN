const { app, BrowserWindow, globalShortcut } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(__dirname, '../assets/noxus_teamplaner_icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  win.loadFile(path.join(__dirname, '../index.html'))

  win.webContents.on('before-input-event', (event, input) => {
    if (!input.control) return
    if (input.key === '=' || input.key === '+') { win.webContents.setZoomLevel(win.webContents.getZoomLevel() + 0.5); event.preventDefault() }
    if (input.key === '-') { win.webContents.setZoomLevel(win.webContents.getZoomLevel() - 0.5); event.preventDefault() }
    if (input.key === '0') { win.webContents.setZoomLevel(0); event.preventDefault() }
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
