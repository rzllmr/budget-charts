import { Entry } from './data.js';

export default interface IElectronAPI {
  askFile: () => Promise<string>
  loadFile: (path: string) => Promise<Array<Entry>>
}
