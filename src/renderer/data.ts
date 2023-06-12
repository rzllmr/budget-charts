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
      return "uneindeutig";
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
  private ignoredCategories = ['Einzahlung', 'Hund'];

  constructor(rows: Array<Entry>) {
    for (const row of rows.reverse()) {
      const newRecord = new Record(
        row['Buchungstag'],
        row['Auftraggeber / Begünstigter'],
        row['Verwendungszweck'],
        row['Betrag (EUR)']
      );
      if (!this.ignoredCategories.includes(newRecord.category)) {
        this.records.push(newRecord);
      }
    }
  }

  private sumDates(convertDate: (date: Date) => string) {
    const sums = new Map<string,Map<string,number>>()
    const knownCategories = Record.known_categories().add('unbekannt');
    this.ignoredCategories.forEach(category => knownCategories.delete(category));

    let unknownSum = 0;
    this.records.forEach((record: Record) => {
      const date = convertDate(record.date);
      const category = record.category;
      const amount = record.amount;

      let categorySums: Map<string,number>;
      if (!sums.has(date)) {
        categorySums = sums.set(date, new Map<string,number>()).get(date)!;
        knownCategories.forEach((category) => categorySums.set(category, 0));
      } else {
        categorySums = sums.get(date)!;
      }

      categorySums.set(category, categorySums.get(category)! - amount);
      if (category == 'unbekannt') unknownSum -= amount;
    });

    sums.forEach((categorySums) => {
      let overallSum = 0;
      categorySums.forEach((amount, category) => {
        overallSum += amount;
      });
      categorySums.set('Gesamt', overallSum);
    })

    if (unknownSum == 0) {
      sums.forEach(categorySums => categorySums.delete('unbekannt'));
    }

    return sums;
  }

  public dateSums(unit: string, upTo: number) {
    const sums = this.sumDates(
      unit == 'months' ? this.yearMonth : this.yearWeek
    );

    const monthSums = new Map<string, Array<ChartEntry<string>>>();
    const allMonths = Array.from(sums.keys());
    const start = upTo >= allMonths.length ? 0 : -upTo;
    const months = allMonths.slice(start, -1);
    for (const month of months) {
      const categories = sums.get(month);
      categories?.forEach((sum: number, category: string) => {
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

  public filter(mode?: string, date?: string, category?: string) {
    const convertDate = mode == "months" ? this.yearMonth : this.yearWeek;
    const recordData = new Array<Array<string>>();
    let sum = 0;
    for (const record of this.records) {
      if (mode != 'all') {
        if (date && date != convertDate(record.date)) continue;
        if (category && category != 'Gesamt' && category != record.category) continue;
      }

      recordData.push(
        [this.yearMonth(record.date, true), record.category, this.money(record.amount), this.mergedInfo(record.client, record.purpose)]
      );
      sum += record.amount;
    }
    recordData.push([date || "", "Gesamt", this.money(sum), "Summe aller Beiträge"]);
    return recordData;
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

  private yearMonth(date: Date, day = false) {
    var dd = String(date.getDate()).padStart(2, '0');
    var mm = String(date.getMonth() + 1).padStart(2, '0');
    var yyyy = date.getFullYear();
    if (day) return `${yyyy}-${mm}-${dd}`;
    else return `${yyyy}-${mm}`;
  }

  private yearWeek(date: Date) {
    const jan1 = new Date(date.getFullYear(), 0, 1);
    const weekNumber = Math.ceil((((date.getTime() - jan1.getTime()) / 86400000) + jan1.getDay() + 1) / 7);
    var ww = String(weekNumber).padStart(2, '0');
    var yyyy = date.getFullYear();
    return `${yyyy}-KW${ww}`;
  }

  private mergedInfo(client: string, purpose: string) {
    let parts = [
      client.replace(/PayPal \(?Europe\)? S\.a.r\.l\. et Cie,? S\.C\.A\.?/, ''),
      purpose.replace(/.+Debitk\.\d+ VISA Debit/, '')
    ];
    return parts.filter((part) => part != '').join(' | ');
  }

  private money(value: number) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(-value);
  }
}
