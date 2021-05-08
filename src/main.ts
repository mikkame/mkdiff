import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import chunk from 'chunk';
import UrlParser from 'url-parse';
import { imgDiff } from 'img-diff-js';
import options, {Option} from './puppeteerOptions';
import CliProgress from 'cli-progress'
import {exec} from 'child_process'

const mkdir = (...paths:Array<string>) => {
  const target = path.join(...paths.map((p) => path.basename(p)));
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target);
  }
};

if (process.argv.length < 3) {
  console.error('Please give file name to first argument');
  process.exit(1);
}

if (process.argv.length > 3) {
  console.error('Please give only file name for first argument');
  process.exit(1);
}
const progress = new CliProgress.SingleBar({}, CliProgress.Presets.shades_classic);




const fileName = process.argv[2];
const resultDir = `result_${path.basename(fileName).replace(new RegExp(`${path.extname(fileName)}$`), '')}`;
mkdir(resultDir);
mkdir(resultDir, 'mkDiffResult');
const batchTime = new Date().getTime();
mkdir(resultDir, 'mkDiffResult', batchTime.toString());

if (!fs.existsSync(fileName)) {
  console.error('The specified file was not found');
  process.exit(1);
}

const urls = fs.readFileSync(fileName).toString();
const list = urls.split('\n').filter(url => url);
progress.start(list.length, 0);
Promise.all(chunk(list, Math.ceil(list.length / 10)).map(async (subList) => {
  await Promise.all(subList.map(async (url) => {
    const parsedUrl = new UrlParser(url);
    const hostName = path.basename(parsedUrl.host);
    mkdir(resultDir, hostName);
    const pathName = parsedUrl.pathname.replace('/', '!');
    mkdir(resultDir, hostName, pathName);
    for (const option of options) {

      mkdir(resultDir, hostName, pathName, option.name);
      const browser = await puppeteer.launch(option);
      const page = await browser.newPage();
      await page.goto(url);
      const targetDir = path.join(...[resultDir, hostName, pathName, option.name].map((p) => path.basename(p)));
      const files = fs.readdirSync(targetDir);
      let latestFile = null;
      if (files.length) {
        latestFile = files[files.length - 1];
      }
      const resultPath = path.join(targetDir, `${batchTime.toString()}.png`);
      await page.screenshot({path: resultPath});
      await browser.close();
      const diffPath = path.join(resultDir, 'mkDiffResult', batchTime.toString(), `${hostName}_${pathName}.png`);
      if (latestFile) {
        const diffResult = await imgDiff({
          actualFilename: path.join(targetDir, latestFile),
          expectedFilename: resultPath,
          diffFilename: diffPath,
        });
        if (diffResult.diffCount === 0) {
          fs.unlinkSync(diffPath);
        }
      }
      progress.increment();
    }
  }));
})).then(() => {
  progress.stop();
  console.log('finish!');
  if (process.platform==='darwin') {
    exec(`open `+ path.join(resultDir, 'mkDiffResult', batchTime.toString()))
  }
});
