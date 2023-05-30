import IElectronAPI from "./preload.js";
import { Data, Entry } from "./data";
import { TimelineFigure } from "./timelinefigure";
import { DetailsTable } from "./detailstable";

declare global {
  interface Window {
    electronAPI: IElectronAPI
  }
}

class RendererIndex {
  private button: HTMLButtonElement;
  private pathText: HTMLElement;

  private data?: Data;
  private timelineFigure: TimelineFigure;
  private detailsTable: DetailsTable;

  private defaultPath = "/Users/robertzillmer/Projects/active/budget-charts/1083895290.csv";

  constructor() {
    this.detailsTable = new DetailsTable();
    this.timelineFigure = new TimelineFigure(this.detailsTable);

    this.button = document.getElementById('btn') as HTMLButtonElement;
    this.pathText = document.getElementById('filePath') as HTMLElement;

    this.registerEvents();
  }

  public pageLoaded() {
    this.loadFile(this.defaultPath);
  }

  private registerEvents() {
    this.button.addEventListener('click', () => this.askAndLoadFile());
  }

  private askAndLoadFile() {
    window.electronAPI.askFile().then(arg => this.loadFile(arg));
  }

  private loadFile(filePath: string) {
    this.pathText.textContent = filePath;
    window.electronAPI.loadFile(filePath).then(arg => this.fillData(arg));
  }

  private fillData(records: Array<Entry>) {
    this.data = new Data(records);
    this.detailsTable.setData(this.data!);
    this.timelineFigure.setData(this.data!.monthSums(Infinity));
  }
}

const rendererIndex = new RendererIndex();
document.addEventListener('DOMContentLoaded', () => rendererIndex.pageLoaded());
