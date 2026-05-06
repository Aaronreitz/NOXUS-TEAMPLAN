const { app, BrowserWindow, shell, net } = require('electron')
const path = require('path')

function checkForUpdates(win) {
  const request = net.request({
    method: 'GET',
    url: 'https://api.github.com/repos/Aaronreitz/NOXUS-TEAMPLAN/releases/latest',
    headers: { 'User-Agent': 'noxus-teamplan' },
  })

  let data = ''
  request.on('response', (response) => {
    response.on('data', (chunk) => { data += chunk })
    response.on('end', () => {
      try {
        const latest = JSON.parse(data).tag_name?.replace(/^v/, '')
        const current = app.getVersion()
        if (latest && latest !== current) {
          win.webContents.executeJavaScript(`
            (function() {
              const el = document.createElement('div');
              el.style.cssText = 'background:#8b1d2c;color:#e6e6e6;padding:6px 24px;display:flex;align-items:center;justify-content:space-between;font-size:13px;border-bottom:1px solid #2a2f3a;';
              el.innerHTML = '<span>Neue Version <strong>v${latest}</strong> verfügbar</span><a href="https://github.com/Aaronreitz/NOXUS-TEAMPLAN/releases/latest" target="_blank" style="color:#fff;font-weight:bold;text-decoration:underline;">Jetzt herunterladen →</a>';
              document.body.insertBefore(el, document.body.firstChild);
            })()
          `)
        }
      } catch {}
    })
  })
  request.on('error', () => {})
  request.end()
}

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

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  win.webContents.on('before-input-event', (event, input) => {
    if (!input.control) return
    if (input.key === '=' || input.key === '+') { win.webContents.setZoomLevel(win.webContents.getZoomLevel() + 0.5); event.preventDefault() }
    if (input.key === '-') { win.webContents.setZoomLevel(win.webContents.getZoomLevel() - 0.5); event.preventDefault() }
    if (input.key === '0') { win.webContents.setZoomLevel(0); event.preventDefault() }
  })

  win.webContents.once('did-finish-load', () => checkForUpdates(win))
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
