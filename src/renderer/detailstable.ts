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
    this.filter('', '');
  }

  filter(month: string, category: string) {
    if (this.data) this.setRows(this.data.all().reverse());
  }

  private setRows(rows: Array<Array<string>>) {
    for (var i = 1; i < this.body.rows.length; i++){
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
