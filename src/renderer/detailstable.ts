import { Data } from './data';

export class DetailsTable {
  private body: HTMLTableSectionElement;
  private data?: Data;

  constructor() {
    const table = document.getElementById("details-table") as HTMLTableElement;
    this.body = table.tBodies[0];
  }

  public setData(data: Data) {
    this.data = data;
    this.listRecords();
  }

  listRecords(mode?: string, date?: string, category?: string) {
    if (this.data == undefined) return;
    this.setRows(this.data.filter(mode, date, category).reverse());
  }

  private setRows(rows: Array<Array<string>>) {
    for (var i = this.body.rows.length-1; i >= 0; i--){
      this.body.deleteRow(i);
    }
        
    for (const row of rows) {
      const newRow = this.body.insertRow();
      for (const entry of row) {
        const newCell = newRow.insertCell();
        newCell.textContent = entry;
      }
    }
  }
}
