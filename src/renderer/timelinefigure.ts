const { Chart, registerables, Color } = require("chart.js");
import { DetailsTable } from "./detailstable";

export type ButtonInfo = {
  category: string, borderColor: string, backgroundColor: string
};

export class TimelineFigure {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D | null;
  private chart: any;
  private mode: string;

  private table: DetailsTable;

  constructor(table: DetailsTable) {
    Chart.register(...registerables);

    this.canvas = document.getElementById("timeline-chart") as HTMLCanvasElement;
    this.context = this.canvas.getContext("2d");
    this.chart = this.createChart();
    this.mode = 'months';

    this.table = table;
  }

  public createChart() {
    const config = {
      type: 'line',
      options: {
        scales: {
          y: {
            ticks: {
              callback: (value: string, index: number, ticks: Array<any>) => {
                return value + '€';
              }
            }
          }
        }
      }
    };

    this.canvas.onclick = (event) => {
      const selection = this.chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
      if (selection.length === 0) return;
      const month = this.chart.data.labels[selection[0].index];
      const category = this.chart.data.datasets[selection[0].datasetIndex].label;
      console.log(month, category);
      this.table.listRecords(month, category);
    }

    return new Chart(this.context, config);
  }

  public setData(mode: string, datasets: Array<{label: string, data:Array<{x: string, y: any}>}>) {
    this.mode = mode;

    const labels = new Array<string>();
    for (const point of datasets[0].data) {
      labels.push(point.x);
    }
    this.chart.data.labels = labels;

    this.chart.data.datasets = [];
    for (const dataset of datasets) {
      this.chart.data.datasets.push({
        label: dataset.label,
        data: dataset.data.map((entry) => entry.y),
        hidden: false
      });
    }
    this.chart.update();
  }

  public categoryColors(): Array<ButtonInfo> {
    return this.chart.data.datasets.map((dataset: any) => {
      return {
        category: dataset.label,
        borderColor: dataset.borderColor,
        backgroundColor: dataset.backgroundColor
      };
    });
  }

  public toggleData(label: string) {
    const dataset = this.chart.data.datasets.find((dataset: any) => dataset.label == label);
    dataset.hidden = !dataset.hidden;
    this.chart.update();
  }
}
