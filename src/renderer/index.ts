import IElectronAPI from "./preload.js";
import { Data, Entry } from "./data";
import { TimelineFigure, ButtonInfo } from "./timelinefigure";
import { DetailsTable } from "./detailstable";
import { BudgetsTable } from "./budgetstable";

declare global {
  interface Window {
    electronAPI: IElectronAPI
  }
}

class RendererIndex {
  private toggleButtons: Array<HTMLButtonElement>;
  private loadButton: HTMLButtonElement;
  private pathText: HTMLElement;

  private data?: Data;
  private timelineFigure: TimelineFigure;
  private detailsTable: DetailsTable;
  private budgetsTable: BudgetsTable;
  private timeMode: string;
  private budgetMode: boolean;

  private defaultPath = "/Users/robertzillmer/Projects/active/budget-charts/1083895290.csv";

  constructor() {
    this.detailsTable = new DetailsTable();
    this.budgetsTable = new BudgetsTable();
    this.timelineFigure = new TimelineFigure(this.detailsTable, this.budgetsTable);

    this.toggleButtons = new Array<HTMLButtonElement>();
    this.loadButton = document.getElementById('load-button') as HTMLButtonElement;
    this.pathText = document.getElementById('filepath') as HTMLElement;
    this.timeMode = 'months';
    this.budgetMode = false;

    this.loadButton.addEventListener('click', () => this.askAndLoadFile());
  }

  public pageLoaded() {
    if (this.defaultPath.length > 0) {
      this.loadFile(this.defaultPath);
    }
  }

  private toggleBudgets() {
    this.budgetMode = !this.budgetMode;
    this.timelineFigure.setData(this.timeMode, this.data!.dateSums(this.timeMode, 12, this.budgetMode), true);
  }

  private toggleTimeline() {
    this.timeMode = this.timeMode == 'months' ? 'weeks' : 'months';
    this.timelineFigure.setData(this.timeMode, this.data!.dateSums(this.timeMode, 12, this.budgetMode));
    this.toggleDefaults(this.timeMode, this.timelineFigure);
  }

  private toggle(button: HTMLButtonElement, activate: boolean | null = null) {
    this.timelineFigure.toggleData(button.textContent || '', activate);
    if (activate == true) button.classList.remove('hidden');
    else if (activate == false) button.classList.add('hidden');
    else button.classList.toggle('hidden');
  }

  private askAndLoadFile() {
    window.electronAPI.askFile().then(path => {
      if (path != null) this.loadFile(path);
    });
  }

  private loadFile(filePath: string) {
    window.electronAPI.loadFile(filePath).then(records => {
      if (typeof records == 'string') {
        this.pathText.textContent = `Failed to load ${filePath}.`;
      } else {
        this.fillData(records);
        this.pathText.textContent = filePath;
      }
    });
  }

  private fillData(records: Array<Entry>) {
    this.data = new Data(records);
    this.detailsTable.setData(this.data!);
    this.budgetsTable.setData(this.data!);
    this.timelineFigure.setData(this.timeMode, this.data!.dateSums('months', 12));
    this.generateButtons(this.timelineFigure.categoryColors());
    this.toggleBudgets();
    this.toggleDefaults(this.timeMode, this.timelineFigure);
  }

  private generateButtons(infos: Array<ButtonInfo>) {
    const toggles = document.getElementById('toggles') as HTMLDivElement;

    this.toggleButtons.forEach(btn => toggles.removeChild(btn));
    this.toggleButtons = []

    const budgetToggle = document.getElementById('budget-toggle') as HTMLButtonElement;
    budgetToggle.addEventListener('click', () => this.toggleBudgets());

    const timeToggle = document.getElementById('time-toggle') as HTMLButtonElement;
    timeToggle.addEventListener('click', () => this.toggleTimeline());

    infos.forEach(info => {
      const toggleButton = document.createElement('button');
      toggleButton.textContent = info.category;
      toggleButton.style.borderColor = info.borderColor;
      toggleButton.style.backgroundColor = info.backgroundColor;
      toggleButton.addEventListener('click', () => this.toggle(toggleButton));
      toggles.appendChild(toggleButton);
      this.toggleButtons.push(toggleButton);
    });
  }

  private toggleDefaults(timeMode: string, figure: TimelineFigure) {
    let defaultActives: Array<string>;
    let highlight: string;
    if (timeMode == 'months') {
      defaultActives = ['Anschaffungen', 'Einkauf', 'Freizeit', 'Urlaub'];
      highlight = 'Anschaffungen';
    } else {
      defaultActives = ['Einkauf', 'Freizeit'];
      highlight = 'Freizeit';
    }
    this.toggleButtons.forEach(button => {
      this.toggle(button, defaultActives.includes(button.textContent || ''));
    });
    figure.select(figure.latestDate(), highlight);
  }
}

const rendererIndex = new RendererIndex();
document.addEventListener('DOMContentLoaded', () => rendererIndex.pageLoaded());
