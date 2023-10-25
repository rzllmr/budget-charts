import { Data } from './data';

export class BudgetsTable {
  private label: HTMLDivElement;
  private head: HTMLTableSectionElement;
  private body: HTMLTableSectionElement;
  private data?: Data;

  constructor() {
    this.label = document.getElementById("budgets-container")?.getElementsByClassName("label")[0] as HTMLDivElement;
    const table = document.getElementById("budgets-table") as HTMLTableElement;
    this.head = table.tHead!;
    this.body = table.tBodies[0];
  }

  public setData(data: Data) {
    this.data = data;
    this.listBudgets("months");
  }

  listBudgets(mode?: string, date?: string) {
    if (this.data == undefined) return;

    const currDate = date || this.data.latest("months");
    this.label.textContent = `remaining budget for ${currDate}`;
    this.setRows(this.data.budgets(mode, currDate));
  }

  private setRows(rows: Array<Array<string>>) {
    const maxColumn = this.head.rows[0].cells.length - 1;
    for (let idx=0; idx < rows[0].length; idx++) {
      if (idx > maxColumn) break;
      this.head.rows[0].cells[idx].textContent = rows[0][idx];
    }
    for (let idx=0; idx < rows[1].length; idx++) {
      if (idx > maxColumn) break;
      this.body.rows[0].cells[idx].textContent = rows[1][idx];
    }
  }
}
