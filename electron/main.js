const { app, BrowserWindow, shell, net, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

const BACKUP_KEEP = 30
const BACKUP_NAME = /^Teamplan_\d{4}-\d{2}-\d{2}\.json$/

// Packaged: "Sicherungen" next to the .exe, so everything stays in the app
// folder. Dev: userData, so backups don't end up in the repo or the build.
function backupDirs() {
  const dirs = [path.join(app.getPath('userData'), 'Sicherungen')]
  if (app.isPackaged) dirs.unshift(path.join(path.dirname(app.getPath('exe')), 'Sicherungen'))
  return dirs
}

// One file per day (overwritten during the day), the newest BACKUP_KEEP are kept.
function writeBackup(json) {
  const day = new Date().toLocaleDateString('sv-SE') // YYYY-MM-DD, local time
  for (const dir of backupDirs()) {
    try {
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, `Teamplan_${day}.json`), json)
      const old = fs.readdirSync(dir).filter((f) => BACKUP_NAME.test(f)).sort().slice(0, -BACKUP_KEEP)
      for (const f of old) fs.unlinkSync(path.join(dir, f))
      return dir
    } catch {
      // App folder not writable (e.g. under Program Files): fall back to userData.
    }
  }
  return null
}

ipcMain.handle('backup:save', (_event, json) => {
  if (typeof json !== 'string') return null
  try { JSON.parse(json) } catch { return null }
  return writeBackup(json)
})

// "1.2.0-modern" -> [1, 2, 0]; anything not starting with x.y.z -> null.
function parseVersion(v) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(String(v ?? ''))
  return m ? m.slice(1).map(Number) : null
}

function isNewer(latest, current) {
  const a = parseVersion(latest)
  const b = parseVersion(current)
  if (!a || !b) return false
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i]
  }
  return false
}

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
        // Only the numeric part is used: it gets spliced into executeJavaScript below.
        const latest = parseVersion(JSON.parse(data).tag_name)?.join('.')
        if (latest && isNewer(latest, app.getVersion())) {
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
    width: 1480,
    height: 940,
    icon: path.join(__dirname, '../assets/noxus_teamplaner_icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
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
