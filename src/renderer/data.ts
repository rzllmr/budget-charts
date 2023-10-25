const categoryInfos: Info[] = require('./categories.json');

type Budget = {
  since: string;
  value: number;
}

type Info = {
  category: string;
  patterns: string[];
  budget: Budget[]; 
}

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
      for (const info of categoryInfos) {
        const pattern = new RegExp(`(${info.patterns.join('|')})`, "i");
        Record.category_patterns.set(info.category, pattern);
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

  public static currentBudget(category: string, date?: string): number | null {
    if (date == undefined) return null;
    const weekBudget = date.includes('KW');
    let currentBudget = null;
    for (const info of categoryInfos) {
      let infoCategory = info.category;
      if (infoCategory == "Einkauf") infoCategory = "Essen";
      if (infoCategory == category) {
        if (info.budget == undefined || info.budget.length == 0) return null;
        for (const budget of info.budget) {
          const currentDate = weekBudget ? Record.weekDay(date) : new Date(date);
          if (currentDate < new Date(budget.since)) break;
          currentBudget = budget.value;
          if (weekBudget) currentBudget /= 4;
        }
      }
    }
    return currentBudget;
  }

  private static weekDay(yearWeek: string): Date {
    const match = yearWeek.match(/(\d+)-KW(\d+)/);
    if (match == null || match?.length < 3) throw new Error(`no week of the year format: ${yearWeek}`);

    const year = parseInt(match[1]);
    const week = parseInt(match[2]);
    const day = 2 + (week - 1) * 7;
    return new Date(year, 0, day);
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
      let foodSum = 0;
      categorySums.forEach((amount, category) => {
        overallSum += amount;
        if (['Einkauf', 'Restaurant'].includes(category)) foodSum += amount;
      });
      categorySums.set('Gesamt', overallSum);
      categorySums.set('Essen', foodSum);
    })

    if (unknownSum == 0) {
      sums.forEach(categorySums => categorySums.delete('unbekannt'));
    }

    return sums;
  }

  public dateSums(unit: string, upTo: number, budgetBars = false) {
    const sums = this.sumDates(
      unit == 'months' ? this.yearMonth : this.yearWeek
    );

    const dateSums = new Map<string, Array<ChartEntry<string>>>();
    const dateBudgets = new Map<string, Array<ChartEntry<string>>>();
    const allDates = Array.from(sums.keys());
    const start = upTo >= allDates.length ? 0 : -upTo;
    const dates = allDates.slice(start);
    for (const date of dates) {
      const categories = sums.get(date);
      categories?.forEach((sum: number, category: string) => {
        if (!dateSums.has(category)) dateSums.set(category, new Array<ChartEntry<string>>());
        dateSums.get(category)!.push({
          x: date, y: sum
        });
        const budget = Record.currentBudget(category, date);
        if (budget != null) {
          if (!dateBudgets.has(category)) dateBudgets.set(category, new Array<ChartEntry<string>>());
          dateBudgets.get(category)!.push({
            x: date, y: budget
          });
        }
      });
    }

    const chartData = new Array<{label: string, data: Array<ChartEntry<string>>, type: string}>;
    dateSums.forEach((values, category) => {
      chartData.push({
        label: category, data: values, type: "line"
      });
    });
    if (budgetBars) {
      dateBudgets.forEach((values, category) => {
        chartData.push({
          label: category, data: values, type: "bar"
        });
      });
    }
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
        if (category && category != 'Gesamt' && category != "Essen" && category != record.category) continue;
        if (category == 'Essen' && !['Einkauf', 'Restaurant'].includes(record.category)) continue;
      }

      recordData.push(
        [this.yearDay(record.date), record.category, this.money(record.amount), this.mergedInfo(record.client, record.purpose)]
      );
      sum += record.amount;
    }
    
    recordData.push([date || "", "Gesamt", this.money(sum), "Summe aller Beiträge"]);
    return recordData;
  }

  public budgets(mode?: string, date?: string) {
    const sums = this.sumDates(
      mode == 'months' ? this.yearMonth : this.yearWeek
    );
    if (date == undefined) return [];
    
    const budgets = new Map<string,string>();
    sums.get(date)?.forEach((sum, category) => {
      const budget = Record.currentBudget(category, date);
      if (budget == null) return;

      budgets.set(category, this.money(- budget + sum));
    });

    const restSpending = new Map<string,number>();
    const yearBudgets = new Map<string,number>();
    sums.forEach((categorySums, _date) => {
      if (_date.split('-')[0] != date.split('-')[0]
        || parseInt(_date.substring(_date.length - 2)) > parseInt(date.substring(date.length - 2))) return;

      categorySums.forEach((sum, category) => {
        const budget = Record.currentBudget(category, _date);
        if (budget == null) {
          if (!['Einrichtung'].includes(category)) return;
          const summedSpending = restSpending.get(category) || 0;
          restSpending.set(category, summedSpending + sum);
        } else {
          const summedBudget = yearBudgets.get(category) || 0;
          yearBudgets.set(category, summedBudget + ( - budget + sum));
        }
      });
    });

    let overallDiff = 0;
    restSpending.forEach((sum) => overallDiff += sum);
    yearBudgets.forEach((sum, category) => {
      if (!['Urlaub'].includes(category)) overallDiff += sum;
    });

    const recordData = new Array<Array<string>>([], []);
    const sortedKeys = Array.from(budgets.keys()).sort();
    for (const category of sortedKeys) {
      if (category != 'Urlaub') {
        recordData[0].push(`${category} (m)`);
        recordData[1].push(budgets.get(category)!);
      }
      recordData[0].push(`${category} (y)`);
      recordData[1].push(this.money(yearBudgets.get(category)!));
    }
    recordData[0].push(`Gesamt`);
    recordData[1].push(this.money(overallDiff));
    return recordData;
  }

  public recordsSince(daySpan: number) {
    let latest = new Date(this.records[this.records.length-1].date);
    latest.setDate(latest.getDate() - daySpan);
    return this.records.filter(record => record.date > latest);
  }

  public latest(mode: string): string {
    const latestRecord = this.records[this.records.length - 1];
    const convertDate = mode == 'months' ? this.yearMonth : this.yearWeek;
    return convertDate(latestRecord.date);
  }

  private yearMonth(date: Date) {
    var mm = String(date.getMonth() + 1).padStart(2, '0');
    var yyyy = date.getFullYear();
    return `${yyyy}-${mm}`;
  }

  private yearWeek(date: Date) {
    const jan1 = new Date(date.getFullYear(), 0, 1);
    const weekNumber = Math.ceil((((date.getTime() - jan1.getTime()) / 86400000) + jan1.getDay() + 1) / 7);
    var ww = String(weekNumber).padStart(2, '0');
    var yyyy = date.getFullYear();
    return `${yyyy}-KW${ww}`;
  }

  private yearDay(date: Date) {
    var dd = String(date.getDate()).padStart(2, '0');
    var mm = String(date.getMonth() + 1).padStart(2, '0');
    var yyyy = date.getFullYear();
    return `${yyyy}-${mm}-${dd}`;
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
