const { Chart, registerables } = require("chart.js");
const annotationPlugin = require('chartjs-plugin-annotation');
const Color = require("color");
import { DetailsTable } from "./detailstable";

class Annotation {
  private _display = false;
  private _pos = {x: 0, y: 0};
  private _color = 'rgba(0, 0, 0, 0.5)';
  private _radius = 0;

  constructor() {}

  public display(): boolean {
    return this._display;
  }
  public posX(): number {
    return this._pos.x;
  }
  public posY(): number {
    return this._pos.y;
  }
  public color(): string {
    return this._color;
  }
  public radius(): number {
    return this._radius;
  }

  public set(color: string, posX: number, posY:number) {
    this._color = color;
    this._pos = {x: posX, y: posY};
    this._radius = 10;
    this._display = true;
  }

  public unset() {
    this._display = false;
    this._radius = 0;
  }
}

export type ButtonInfo = {
  category: string, borderColor: string, backgroundColor: string
};

export class TimelineFigure {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D | null;
  private annotation: Annotation;
  private chart: any;
  private mode: string;
  private hidden: Set<string>;
  private highlighted: string;

  private table: DetailsTable;

  constructor(table: DetailsTable) {
    Chart.register(...registerables, annotationPlugin);

    this.canvas = document.getElementById("timeline-chart") as HTMLCanvasElement;
    this.context = this.canvas.getContext("2d");
    this.annotation = new Annotation();
    this.chart = this.createChart();
    this.mode = 'months';
    this.hidden = new Set<string>();
    this.highlighted = '';

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
          annotation: {
            animations: {
              numbers: {
                properties: ['radius'],
                type: 'number'
              },
            },
            annotations: {
              point1: {
                type: 'point',
                display: () => this.annotation.display(),
                xValue: () => this.annotation.posX(),
                yValue: () => this.annotation.posY(),
                backgroundColor: () => this.annotation.color(),
                borderWidth: 0,
                radius: () => this.annotation.radius()
              }
            }
          }
        }
      }
    };

    this.canvas.onclick = (event) => {
      const selection = this.chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
      if (selection.length === 0) return;
      const date = this.chart.data.labels[selection[0].index];
      const dataset = this.chart.data.datasets[selection[0].datasetIndex];
      const category = dataset.label;

      const highlight = `${date}:${category}`;
      if (this.highlighted == highlight) {
        this.highlighted = '';
        this.table.listRecords('all', '', '');
        this.annotation.unset();
      } else {
        this.highlighted = highlight;
        this.table.listRecords(this.mode, date, category);
        this.annotation.set(
          dataset.backgroundColor,
          selection[0].index,
          dataset.data[selection[0].index]
        );
      }
      this.chart.update();
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
        hidden: this.hidden.has(dataset.label)
      });
    }

    this.highlighted = '';
    this.table.listRecords('all', '', '');
    this.annotation.unset();

    this.chart.update();
  }

  public generateColors(labels: Array<string>): Map<string, {border: string, background: string}> {
    const palette = [
      "#fd7f6f", "#7eb0d5", "#b2e061", "#bd7ebe", "#ffb55a", "#ffee65", "#beb9db", "#fdcce5", "#8bd3c7"
      // spring pastels of https://www.heavy.ai/blog/12-color-palettes-for-telling-better-stories-with-your-data
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
    if (dataset.hidden) {
      dataset.hidden = false;
      this.hidden.delete(dataset.label);
    } else {
      dataset.hidden = true;
      this.hidden.add(dataset.label);
    }
    this.chart.update();
  }
}
