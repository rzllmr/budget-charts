const category_strings = require('./categorization.json');

class Record {
  public category: string;
  public date: Date;
  public client: string;
  public purpose: string;
  public amount: number;
  public sum: number;

  private static sum: number = 0;

  constructor(date?: string, client?: string, purpose?: string, amount?: string) {
    if (date == undefined || client == undefined || purpose == undefined || amount == undefined) throw 'undefined';
    this.date = new Date(date.replace(/(\d+)\.(\d+)\.(\d+)/,"$3-$2-$1"));
    this.client = client;
    this.purpose = purpose;
    this.amount = parseFloat(amount.replace(/\./g, "").replace(/\,/g, "."));
    Record.sum += this.amount;
    this.sum = Record.sum;

    this.category = Record.categorize(this.client, this.purpose);
  }

  public static known_categories(): Set<string> {
    return new Set(Record.category_patterns.keys());
  }

  private static category_patterns = new Map<string, RegExp>();
  private static categories(): Map<string, RegExp> {
    if (Record.category_patterns.size == 0) {
      for (const [key, values] of Object.entries(category_strings) as [string, string[]][]) {
      // category_strings.forEach((values: string[], key: string) => {
        const pattern = new RegExp(`(${values.join('|')})`, "i");
        Record.category_patterns.set(key, pattern);
      }
    }
    return Record.category_patterns;
  }

  private static categorize(client: string, purpose: string): string {
    const combined = client + '#' + purpose;

    let categories = new Array<string>();
    Record.categories().forEach((pattern: RegExp, name: string) => {
      if (pattern.test(combined)) categories.push(name);
    });

    if (categories.length == 0) {
      console.warn(`unbekannt: ${client} | ${purpose}`);
      return "unbekannt";
    } else if (categories.length > 1) {
      console.warn(`${categories.join('|')}: ${client} | ${purpose}`)
      return "ambiguous";
    }

    return categories[0];
  }
}

export type Entry = {
  'Buchungstag': string,
  'Auftraggeber / Begünstigter': string,
  'Verwendungszweck': string,
  'Betrag (EUR)': string
};

export type ChartEntry<T> = {
  x: T,
  y: number
}

export class Data {
  private records = new Array<Record>();
  private sums = new Map<string,Map<string,number>>();

  constructor(rows: Array<Entry>) {
    console.log("constructing...");
    for (const row of rows.reverse()) {
      this.records.push(new Record(
        row['Buchungstag'],
        row['Auftraggeber / Begünstigter'],
        row['Verwendungszweck'],
        row['Betrag (EUR)']
      ));
    }
    this.sumMonths();
    console.log("done.");
  }

  private sumMonths() {
    const knownCategories = Record.known_categories().add('unbekannt');

    this.records.forEach((record: Record) => {
      const date = this.isoDate(record.date);
      const category = record.category;
      const amount = record.amount;

      let monthMap: Map<string,number>;
      if (!this.sums.has(date)) {
        monthMap = this.sums.set(date, new Map<string,number>()).get(date)!;
        knownCategories.forEach((category) => monthMap.set(category, 0));
      } else {
        monthMap = this.sums.get(date)!;
      }

      monthMap.set(category, monthMap.get(category)! - amount);
    });
  }

  public monthSums(lastMonths: number) {
    const ignoreCategories = ['Einzahlung', 'Hund'];

    const monthSums = new Map<string, Array<ChartEntry<string>>>();
    const start = lastMonths == Infinity ? 0 : -lastMonths;
    const months = Array.from(this.sums.keys()).slice(start, -1);
    for (const month of months) {
      const categories = this.sums.get(month);
      categories?.forEach((sum: number, category: string) => {
        if (ignoreCategories.includes(category)) return;
        if (!monthSums.has(category)) monthSums.set(category, new Array<ChartEntry<string>>());
        monthSums.get(category)!.push({
          x: month, y: sum
        });
      });
    }

    const chartData = new Array<{label: string, data: Array<ChartEntry<string>>}>;
    monthSums.forEach((values, category) => {
      chartData.push({
        label: category, data: values
      })
    });
    return chartData.sort((a, b) => {
      const aSum = a.data.reduce((partialSum: number, c) => partialSum + c.y, 0);
      const bSum = b.data.reduce((partialSum: number, d) => partialSum + d.y, 0);
      return bSum - aSum;
    });
  }

  public all() {
    return this.records.map((record) => {
      return [this.isoDate(record.date, true), record.client, record.purpose, this.money(record.amount)];
    });
  }

  private average(array: number[]): number {
    const sum = array.reduce((a, b) => a + b, 0);
    return (sum / array.length) || 0;
  }

  public recordsSince(daySpan: number) {
    let latest = new Date(this.records[this.records.length-1].date);
    latest.setDate(latest.getDate() - daySpan);
    return this.records.filter(record => record.date > latest);
  }

  private isoDate(date: Date, day = false) {
    var dd = String(date.getDate()).padStart(2, '0');
    var mm = String(date.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = date.getFullYear();
    if (day) return `${yyyy}-${mm}-${dd}`;
    else return `${yyyy}-${mm}`;
  }

  private money(value: number) {
    return value.toString();
  }
}
