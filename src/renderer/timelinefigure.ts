const { Chart, registerables } = require("chart.js");
const Color = require("color");
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
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context: any) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(context.parsed.y);
                }
                return label;
              }
            }
          },
          }
        }
      }
    };

    this.canvas.onclick = (event) => {
      const selection = this.chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
      if (selection.length === 0) return;
      const date = this.chart.data.labels[selection[0].index];
      const category = this.chart.data.datasets[selection[0].datasetIndex].label;
      this.table.listRecords(this.mode, date, category);
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

    const colors = this.generateColors(
      datasets.map(dataset => dataset.label).sort()
    );

    this.chart.data.datasets = [];
    for (const dataset of datasets) {
      this.chart.data.datasets.push({
        label: dataset.label,
        data: dataset.data.map((entry) => entry.y),
        borderColor: colors.get(dataset.label)?.border,
        backgroundColor: colors.get(dataset.label)?.background,
        hidden: false
      });
    }
    this.chart.update();
  }

  public generateColors(labels: Array<string>): Map<string, {border: string, background: string}> {
    const palette = [
      "#fd7f6f", "#7eb0d5", "#b2e061", "#bd7ebe", "#ffb55a", "#ffee65", "#beb9db", "#fdcce5", "#8bd3c7" // spring pastels
    ];
    const colors = new Map<string, {border: string, background: string}>();
    for (let i = 0; i < labels.length; i++) {
      const color = Color(palette[i % palette.length]);
      colors.set(labels[i], {
        border: color.hsl().string(),
        background: color.hsl().fade(0.5).string()
      });
    }
    return colors;
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
