import { app, BrowserWindow, ipcMain, dialog } from "electron";
import * as path from "path";
import * as fs from 'fs';
import { parse } from 'csv-parse';
import { Entry } from '../renderer/data.js';

class Main {
  private mainWindow?: BrowserWindow;

  public init() {
    app.on('ready', this.createWindow);
    app.on('window-all-closed', this.onWindowAllClosed);
    app.on('activate', this.onActivate);

    ipcMain.handle('dialog:askFile', this.askFile);
    ipcMain.handle('dialog:loadFile', this.loadFile);
  }

  private onWindowAllClosed() {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  }

  private onActivate(){
    if (!this.mainWindow) {
      this.createWindow();
    }
  }

  private createWindow() {
    this.mainWindow = new BrowserWindow({
      height: 1080,
      width: 1920,
      title: `Budget Charts`,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: true,
        preload: path.join(__dirname, "preload.js")
      }
    });
    this.mainWindow.setAspectRatio(16/9);

    this.mainWindow.webContents.openDevTools();
    this.mainWindow.loadFile(path.join(__dirname, "../index.html"));
  }

  private async askFile() {
    const { canceled, filePaths } = await dialog.showOpenDialog({});
    if (canceled) {
      return null;
    } else {
      return filePaths[0];
    }
  }

  private async loadFile(event: Electron.IpcMainInvokeEvent, path: string) {
    return new Promise((resolve) => {
      const records = new Array<Entry>;
      fs.createReadStream(path, {encoding: 'utf8'})
        .pipe(parse({delimiter: ';', from_line: 7, columns: true}))
        .on('data', (row) => records.push(row))
        .on('end', () => resolve(records))
    });
  }
}

(new Main()).init();
