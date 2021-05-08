import { BrowserConnectOptions, BrowserLaunchArgumentOptions, LaunchOptions } from 'puppeteer';

export type Option = LaunchOptions & BrowserLaunchArgumentOptions & BrowserConnectOptions & { product?: 'chrome' | 'firefox' | undefined} & {name:string}
const options:Array<Option> = [
  {
    name: 'default',
    defaultViewport: {
      width: 1920,
      height: 1280,
    },
  },
];
export default options;
