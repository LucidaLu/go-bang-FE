// Modules to control application life and create native browser window
const {
    app,
    Menu,
    BrowserWindow,
    ipcMain
} = require('electron')

function createWindow() {
    Menu.setApplicationMenu(null);

    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        maximizable: false,
        webPreferences: {
            nodeIntegration: true
        },
        frame: false,
        resizable: false
    })
    mainWindow.loadURL(`file://${__dirname}/index.html`);
    //mainWindow.webContents.openDevTools()
    ipcMain.on('close', e => mainWindow.close());
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
