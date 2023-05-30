const { Chart, registerables } = require("chart.js");
import { DetailsTable } from "./detailstable";

export class TimelineFigure {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D | null;
  private chart: any;

  private table: DetailsTable;

  constructor(table: DetailsTable) {
    Chart.register(...registerables);

    this.canvas = document.getElementById("timeline-chart") as HTMLCanvasElement;
    this.context = this.canvas.getContext("2d");
    this.chart = this.createChart();

    this.table = table;
  }

  createChart() {
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
      this.table.filter(month, category);
    }

    return new Chart(this.context, config);
  }

  setData(datasets: Array<{label: string, data:Array<{x: string, y: any}>}>) {
    const labels = new Array<string>();
    for (const point of datasets[0].data) {
      labels.push(point.x);
    }
    this.chart.data.labels = labels;

    this.chart.data.datasets = [];
    for (const dataset of datasets) {
      this.chart.data.datasets.push({
        label: dataset.label,
        data: dataset.data.map((entry) => entry.y)
      });
    }
    this.chart.update();
  }
}
