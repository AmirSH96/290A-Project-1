import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const WORKSPACE = '/Users/amirsh96/290A/Project 1/presentation';
const PROJECT = path.dirname(WORKSPACE);
const RUNTIME = '/Users/amirsh96/.cache/codex-runtimes/codex-primary-runtime';
const SKILL = '/Users/amirsh96/.codex/plugins/cache/openai-primary-runtime/presentations/26.1104.22356/skills/presentations';
const require = createRequire(path.join(RUNTIME, 'dependencies/node/node_modules/__runtime__.cjs'));
const { Presentation, PresentationFile } = await import(pathToFileURL(require.resolve('@oai/artifact-tool')).href);
const { finalizePresentation, applyPresentationChartFont } = await import(pathToFileURL(path.join(SKILL, 'container_tools/artifact_tool_utils.mjs')).href);
const sharp = require('sharp');
const inventory = JSON.parse(await fs.readFile(path.join(WORKSPACE, 'notebook_graph_inventory.json'), 'utf8'));
const story = JSON.parse(await fs.readFile(path.join(WORKSPACE, 'storyboard.json'), 'utf8'));
const BUILD = path.join(WORKSPACE, '.build');
const OUTPUT = path.join(WORKSPACE, 'output');
const RENDERS = path.join(BUILD, 'renders-presentation');
await fs.mkdir(RENDERS, { recursive: true });
await fs.mkdir(OUTPUT, { recursive: true });

async function csv(relativePath) {
  const lines = (await fs.readFile(path.join(PROJECT, relativePath), 'utf8')).trim().split(/\r?\n/);
  const keys = lines.shift().split(',');
  return lines.map(line => Object.fromEntries(line.split(',').map((value, index) => [keys[index], value])));
}
const monthly = await csv('month_end_results/model_comparison.csv');
const regularization = await csv('week6_regularization_results/comparison.csv');
const allRegularization = await csv('week6_regularization_results/all_scores.csv');
const ensembles = await csv('week6_ensemble_results/scores.csv');
const monthlyPredictions = await csv('month_end_results/predictions.csv');
const ensemblePredictions = await csv('week6_ensemble_results/predictions.csv');
const regularizationPredictions = await csv('week6_regularization_results/predictions.csv');

const presentation = Presentation.create({ slideSize: { width: 1280, height: 720 } });
const C = { ink: '#17324A', blue: '#2375A6', orange: '#D77D35', gray: '#B9C2CC', muted: '#596C7D', amber: '#996013' };
const imageUsage = [];
const used = new Set();
const slideManifest = [];
const nativeChartOwners = new Set();

function text(slide, value, left, top, width, height, size = 24, color = C.ink, bold = false, align = 'left') {
  const shape = slide.shapes.add({
    geometry: 'textbox',
    position: { left, top, width, height },
    fill: 'none',
    line: { style: 'solid', fill: 'none', width: 0 },
  });
  shape.text = value;
  shape.text.style = { typeface: 'Arial', fontSize: size, color, bold,
    alignment: align, verticalAlignment: 'top', wrap: 'square', autoFit: 'none', insets: 0 };
  return shape;
}

function newSlide(title, notes, source, appendix = false) {
  const slide = presentation.slides.add();
  slide.background.fill = '#FFFFFF';
  const number = presentation.slides.items.length;
  text(slide, title, 60, 40, 1160, 68, 44, C.ink, true);
  text(slide, source, 60, 682, 1080, 24, 14, C.muted);
  text(slide, String(number), 1160, 682, 60, 24, 16, C.muted, false, 'right');
  slide.speakerNotes.text = `${notes}\n\nSource: ${source}`;
  slideManifest.push({ number, title, appendix, source, images: [] });
  return slide;
}

async function image(slide, entry, frame) {
  const bytes = await fs.readFile(entry.asset_path);
  const meta = await sharp(bytes).metadata();
  const scale = Math.min(frame.width / meta.width, frame.height / meta.height);
  const width = meta.width * scale;
  const height = meta.height * scale;
  slide.images.add({
    blob: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    contentType: 'image/png', fit: 'contain',
    alt: entry.title ?? `${entry.source_folder}/${entry.asset_filename}`,
    position: { left: frame.left + (frame.width - width) / 2,
      top: frame.top + (frame.height - height) / 2, width, height },
  });
  used.add(entry.asset_path);
  const number = presentation.slides.items.length;
  imageUsage.push({ slide: number, path: entry.asset_path, sha256: entry.sha256,
    cell: entry.cell_index ?? null, output: entry.output_index ?? null });
  slideManifest[number - 1].images.push(entry.asset_path);
}

function notebookFigure(cell, output = null) {
  return inventory.notebook_images.find(x => x.cell_index === cell && (output === null || x.output_index === output));
}
function supplement(folder, file) {
  return inventory.supplemental_images.find(x => x.source_folder === folder && x.asset_filename === file);
}
function mainNotes(number) {
  return `${story.slides[number - 1].notes}\n\nPlanned narration: ${story.slides[number - 1].seconds} seconds.\nThis slide belongs to the five-minute main presentation.`;
}

function chart(slide, categories, series, frame, maximum, xTitle, yTitle, stacked = false) {
  const result = slide.charts.add('bar', {
    position: frame,
    categories, series,
    hasLegend: true,
    legend: { position: 'bottom', overlay: false, textStyle: { fontSize: 21, fill: C.ink } },
    barOptions: { direction: 'column', grouping: stacked ? 'stacked' : 'clustered', gapWidth: 75 },
    xAxis: { title: { text: xTitle, textStyle: { fontSize: 21, fill: C.ink } },
      textStyle: { fontSize: 21, fill: C.ink }, majorGridlines: null },
    yAxis: { title: { text: yTitle, textStyle: { fontSize: 21, fill: C.ink } },
      min: 0, max: maximum, numberFormatCode: '0.0',
      textStyle: { fontSize: 21, fill: C.ink },
      majorGridlines: { style: 'solid', fill: '#E4EAF0', width: 1 } },
    dataLabels: { showValue: true, position: 'outEnd', numberFormatCode: '0.000',
      textStyle: { fontSize: 20, fill: C.ink, bold: true } },
    chartFill: '#FFFFFF', plotAreaFill: '#FFFFFF',
  });
  applyPresentationChartFont(result, { fontFamily: 'Arial' });
  nativeChartOwners.add(presentation.slides.items.length);
  return result;
}

function days(rows) {
  return rows.map(row => 1 + (Date.parse(row.Date ?? row.date) - Date.UTC(2009, 0, 1)) / 86400000);
}
function curve(name, rows, field, color, width = 2.5) {
  return { name, xValues: days(rows), values: rows.map(row => Number(row[field])),
    smooth: false, line: { style: 'solid', fill: color, width }, marker: { symbol: 'none' } };
}
function points(name, rows, color, size = 3) {
  return { name, xValues: days(rows), values: rows.map(row => Number(row['Actual (C)'])),
    line: { style: 'solid', fill: 'none', width: 0 }, marker: { symbol: 'circle', size, fill: color } };
}
function scatterPlot(slide, city, series) {
  const result = slide.charts.add('scatter', {
    position: { left: 60, top: 140, width: 1160, height: 455 },
    scatterOptions: { style: 'lineWithMarkers' }, series,
    hasLegend: true, legend: { position: 'bottom', overlay: false, textStyle: { fontSize: 21, fill: C.ink } },
    xAxis: { title: { text: 'Day of year in 2009', textStyle: { fontSize: 23, fill: C.ink } },
      min: 1, max: 365, majorUnit: 60, numberFormatCode: '0', textStyle: { fontSize: 22, fill: C.ink },
      position: 'bottom', tickLabelPosition: 'low',
      majorGridlines: { style: 'solid', fill: '#ECF0F3', width: 0.6 } },
    yAxis: { title: { text: 'Daily mean temperature (C)', textStyle: { fontSize: 23, fill: C.ink } },
      min: city === 'Chicago' ? -30 : 8, max: city === 'Chicago' ? 30 : 26,
      crossesAt: city === 'Chicago' ? -30 : 8,
      majorUnit: city === 'Chicago' ? 10 : 4, numberFormatCode: '0',
      textStyle: { fontSize: 22, fill: C.ink }, majorGridlines: { style: 'solid', fill: '#E4EAF0', width: 1 } },
    chartFill: '#FFFFFF', plotAreaFill: '#FFFFFF',
  });
  applyPresentationChartFont(result, { fontFamily: 'Arial' });
  nativeChartOwners.add(presentation.slides.items.length);
  return result;
}

// Main slides cover Section 11 onward only.
{
  const s = newSlide('Chicago and San Diego weather patterns', mainNotes(1),
    'ERA5 course data, 2009–2010. Notebook Section 11, cell 59.');
  text(s, 'ERA5 daily means, 2009–2010. Nearest grid point to each city.', 60, 130, 1160, 48, 26, C.muted);
  text(s, 'Which patterns differ, and which temperature models work best?', 60, 202, 1160, 65, 32, C.ink, true);
  const detail = JSON.parse(await fs.readFile(path.join(WORKSPACE, 'assets/comparison_details.json'), 'utf8')).details.find(x => /temperature/i.test(x.title));
  await image(s, detail, { left: 60, top: 290, width: 1160, height: 290 });
  imageUsage[imageUsage.length - 1].derivative_of = detail.derived_from;
  text(s, 'The initial comparison also covered precipitation, pressure and wind.\nBlue shows daily values. Orange shows monthly means across 2009–2010.',
    60, 607, 1160, 65, 23, C.muted);
}
{
  const s = newSlide('Contrasting temperature patterns', mainNotes(2),
    'Notebook cell 60. Statistics describe daily mean temperatures in this two-year sample.');
  text(s, 'Chicago temperature SD: 10.90 C', 60, 128, 560, 45, 27, C.blue, true);
  text(s, 'San Diego temperature SD: 2.77 C', 660, 128, 560, 45, 27, C.orange, true);
  await image(s, notebookFigure(60), { left: 60, top: 194, width: 1160, height: 398 });
  text(s, 'The source graph’s “US average” is the rectangular study-region average.\nQuoted maxima are daily means. The red line marks the study-region maximum date.',
    60, 604, 1160, 66, 21, C.muted);
}
{
  const s = newSlide('Exploring a precipitation event', mainNotes(3),
    'Notebook cell 61. Region means use the rectangular study area, without a country mask.');
  await image(s, notebookFigure(61), { left: 60, top: 140, width: 780, height: 470 });
  text(s, 'Selected date\n13 March 2010', 880, 160, 340, 105, 29, C.ink, true);
  text(s, 'The highest regional\nprecipitation value\nselected this day.', 880, 298, 340, 135, 25);
  text(s, 'One event is descriptive.\nIt does not establish\nweather causality.', 880, 470, 340, 120, 25, C.muted);
  text(s, 'Original precipitation scaling retained. Its interpretation as daily rainfall totals remains unvalidated.',
    60, 630, 1160, 44, 21, C.amber, true);
}
{
  const s = newSlide('Next-day temperature forecasting', mainNotes(4),
    'Saved notebook cell 62 results. 542 training examples and 181 later test examples.');
  text(s, 'Current and recent weather predict tomorrow’s temperature', 60, 126, 1160, 50, 27);
  await image(s, notebookFigure(62), { left: 60, top: 186, width: 1160, height: 338 });
  text(s, 'Chicago: both models near 1.46 C', 60, 553, 570, 78, 26, C.blue, true);
  text(s, 'San Diego: linear 0.63 C, NN 0.68 C', 680, 553, 540, 78, 26, C.orange, true);
  text(s, 'A chronological forecast task. Its errors answer a different question from the seasonal models.',
    60, 636, 1160, 40, 21, C.muted);
}
{
  const s = newSlide('Learning the seasonal temperature pattern', mainNotes(5),
    'Notebook cells 63–64. Chicago view shown. The San Diego view follows in the appendix.');
  text(s, 'Day of year predicts same-day temperature. Train on 2009, evaluate on 2010.', 60, 128, 1160, 52, 26);
  await image(s, notebookFigure(63, 0), { left: 60, top: 198, width: 1160, height: 352 });
  text(s, 'Chicago MAE: 8.91 to 2.92 C', 60, 573, 560, 50, 29, C.blue, true);
  text(s, 'San Diego MAE: 1.68 to 1.48 C', 660, 573, 560, 50, 29, C.orange, true);
  text(s, 'Both compare straight-line regression with a 10-neuron network using calendar input only.',
    60, 634, 1160, 40, 23, C.muted);
}
{
  const s = newSlide('Monthly validation and network size', mainNotes(6),
    'month_end_results/model_comparison.csv. Same dates, preprocessing and seed for every width.');
  text(s, 'Hold out the final seven days of each month in 2009', 60, 125, 1160, 44, 28, C.ink, true);
  text(s, '281 training days and 84 validation days', 60, 175, 1160, 40, 25, C.muted);
  chart(s, ['5', '10', '20'], ['Chicago', 'San Diego'].map((city, i) => ({
    name: city, fill: i === 0 ? C.blue : C.orange,
    values: [5, 10, 20].map(width => Number(monthly.find(x => x.City === city && Number(x.Neurons) === width)['Validation MAE (C)'])),
  })), { left: 60, top: 232, width: 825, height: 365 }, 3.2, 'Hidden neurons', 'Validation MAE (C)');
  text(s, 'Chicago\n10 neurons\n2.498 C', 935, 260, 285, 145, 30, C.blue, true);
  text(s, 'San Diego\n20 neurons\n1.183 C', 935, 440, 285, 145, 30, C.orange, true);
  text(s, 'This split tests missing dates within 2009. It does not provide a direct comparison with the 2010 scores.',
    60, 632, 1160, 44, 21, C.muted);
}
{
  const s = newSlide('Tuning the L2 weight penalty', mainNotes(7),
    'week6_regularization_results/comparison.csv. San Diego, 10 neurons, same monthly split and seed.');
  const original = regularization.find(x => x.City === 'San Diego' && Number(x.Neurons) === 10 && x.Version === 'Original');
  const selected = regularization.find(x => x.City === 'San Diego' && Number(x.Neurons) === 10 && x.Version === 'Selected');
  chart(s, ['Training', 'Validation'], [
    { name: 'Original alpha 0.0001', fill: C.gray, values: [Number(original['Training MAE (C)']), Number(original['Validation MAE (C)'])] },
    { name: 'Selected alpha 0.001', fill: C.blue, values: [Number(selected['Training MAE (C)']), Number(selected['Validation MAE (C)'])] },
  ], { left: 60, top: 180, width: 825, height: 392 }, 1.6, 'Scored data', 'MAE (C)');
  text(s, 'A stronger penalty\ndiscourages large weights', 930, 175, 290, 110, 28, C.ink, true);
  text(s, 'Validation MAE\n5.8% lower', 930, 340, 290, 100, 32, C.blue, true);
  text(s, 'Training error rises\nslightly as validation\nerror falls', 930, 490, 290, 110, 25, C.muted);
  text(s, 'The original best overall MAEs remain unchanged. Four of six models retain the original penalty.',
    60, 632, 1160, 44, 21, C.muted);
}
{
  const s = newSlide('Penalty strength and sensitivity', mainNotes(8),
    'week6_regularization_results/all_scores.csv. Original values with larger editable labels.');
  for (const [column, city] of ['Chicago', 'San Diego'].entries()) {
    const penalties = [0.0001, 0.001, 0.01, 0.1, 1, 10];
    const plot = s.charts.add('line', {
      position: { left: column === 0 ? 60 : 665, top: 145, width: 555, height: 415 },
      title: city, titleTextStyle: { fontSize: 28, fill: C.ink, bold: true },
      categories: penalties.map(x => String(x)),
      lineOptions: { smooth: false },
      series: [5, 10, 20].map((width, i) => ({
        name: `${width} neurons`, smooth: false,
        values: penalties.map(alpha => Number(allRegularization.find(x => x.City === city && Number(x.Neurons) === width && Number(x.Alpha) === alpha)['Validation MAE (C)'])),
        line: { style: 'solid', fill: [C.blue, C.orange, '#408B58'][i], width: 3 },
        marker: { symbol: 'circle', size: 5, fill: [C.blue, C.orange, '#408B58'][i] },
      })),
      hasLegend: true,
      legend: { position: 'bottom', overlay: false, textStyle: { fontSize: 21, fill: C.ink } },
      xAxis: { title: { text: 'L2 penalty (alpha)', textStyle: { fontSize: 22, fill: C.ink } },
        textStyle: { fontSize: 20, fill: C.ink }, majorGridlines: null },
      yAxis: { title: { text: 'Validation MAE (C)', textStyle: { fontSize: 22, fill: C.ink } },
        min: city === 'Chicago' ? 2.4 : 1.15, max: city === 'Chicago' ? 3.2 : 1.5,
        majorUnit: city === 'Chicago' ? 0.2 : 0.1, numberFormatCode: '0.00',
        textStyle: { fontSize: 20, fill: C.ink }, majorGridlines: { style: 'solid', fill: '#E4EAF0', width: 1 } },
      chartFill: '#FFFFFF', plotAreaFill: '#FFFFFF',
    });
    applyPresentationChartFont(plot, { fontFamily: 'Arial' });
    nativeChartOwners.add(presentation.slides.items.length);
  }
  text(s, 'Stronger penalties do not steadily improve validation MAE.', 60, 590, 1160, 44, 28, C.ink, true);
  text(s, 'Each step multiplies alpha by 10. One initialization per point limits the ranking.',
    60, 637, 1160, 40, 21, C.muted);
}
{
  const s = newSlide('Testing an ensemble', mainNotes(9),
    'week6_ensemble_results/scores.csv. Five fixed seeds, 0 through 4, averaged in Celsius.');
  const winners = [['Chicago', 10], ['San Diego', 20]];
  chart(s, ['Chicago, 10 neurons', 'San Diego, 20 neurons'], [
    { name: 'Original seed-0 model', fill: C.gray,
      values: winners.map(([city, width]) => Number(ensembles.find(x => x.City === city && Number(x.Neurons) === width && x.Model === 'Single (seed 0)')['Validation MAE (C)'])) },
    { name: 'Five-network mean', fill: C.blue,
      values: winners.map(([city, width]) => Number(ensembles.find(x => x.City === city && Number(x.Neurons) === width && x.Model === 'Ensemble (5 seeds)')['Validation MAE (C)'])) },
  ], { left: 60, top: 180, width: 825, height: 395 }, 3.1, 'Earlier winning widths', 'Validation MAE (C)');
  text(s, 'Neither ensemble\nimproved the\nbest original MAE', 930, 185, 290, 130, 29, C.blue, true);
  text(s, 'Some weaker fits pull\nthe average away from\na good solution', 930, 368, 290, 135, 25);
  text(s, 'The full curve and\nmember-spread plot\nappear in the appendix', 930, 530, 290, 106, 23, C.muted);
  text(s, 'Member disagreement measures initialization sensitivity. It is not a calibrated forecast interval.',
    60, 634, 1160, 42, 21, C.muted);
}
{
  const s = newSlide('What the analysis establishes', mainNotes(10),
    'Synthesis of Section 11 and later validation experiments. Full original figures follow in the appendix.');
  text(s, 'What the results support', 60, 160, 540, 50, 31, C.blue, true);
  text(s, 'Chicago shows greater temperature\nvariation in this sample.\n\nModel choices depend on the city\nand the prediction question.\n\nL2 helped one smaller network.\nThe best overall MAE did not improve.',
    60, 233, 540, 335, 27);
  text(s, 'What still needs testing', 690, 160, 530, 50, 31, C.orange, true);
  text(s, 'One training year and one L2 seed\n\nValidation both tunes and reports\n\nRelated temperatures on nearby days\n\nCalendar input omits daily weather',
    690, 233, 530, 335, 26);
  text(s, 'Next: an untouched year, repeated initializations, and a sine/cosine seasonal baseline.',
    60, 610, 1160, 62, 26, C.ink, true);
}

// Supporting figures use complete axes and large legends on every slide.
let appendixNumber = 0;
const representation = [];
function appendix(title, source, note) {
  appendixNumber += 1;
  return newSlide(`Appendix ${appendixNumber}: ${title}`, note, source, true);
}
async function appendixImage(entry, title, caption) {
  const s = appendix(title, path.relative(PROJECT, entry.asset_path), caption);
  await image(s, entry, { left: 60, top: 145, width: 1160, height: 455 });
  if (entry.derived_from) imageUsage[imageUsage.length - 1].derivative_of = entry.derived_from;
  text(s, caption, 60, 617, 1160, 60, 22, C.muted);
}

// Cells 63 and 64 show the same city experiments in separate and combined layouts.
// Keeping the two city views preserves the graphs without a tiny duplicate montage.
await appendixImage(notebookFigure(63, 1), 'San Diego seasonal model',
  '2009 training and 2010 evaluation. This is the San Diego view of the same experiment shown in slide 5.');
representation.push({ source: notebookFigure(64).asset_path, represented_by: ['slide 5 Chicago view', 'slide 11 San Diego view'], reason: 'Equivalent separate city plots of the same experiment' });

for (const city of ['Chicago', 'San Diego']) {
  for (const split of ['Training', 'Validation']) {
    const actual = monthlyPredictions.filter(x => x.City === city && x.Model === 'Linear regression' && x.Split === split);
    const s = appendix(`${city} ${split.toLowerCase()} fits`,
      'month_end_results/predictions.csv. Original monthly-fit values with complete standalone axes.',
      'Day of year predicts daily mean temperature. Fitted curves use 281 training days; each month supplies seven held-out validation dates.');
    scatterPlot(s, city, [
      points('ERA5 data', actual, '#717D88', 3),
      ...[['Linear regression', '#151C24'], ['NN 5', '#2375A6'], ['NN 10', '#D77D35'], ['NN 20', '#408B58']].map(([name, color]) =>
        curve(name, monthlyPredictions.filter(x => x.City === city && x.Model === name), 'Predicted (C)', color)),
    ]);
    text(s, `${split} observations appear as dots. Every curve is fitted to the same training dates.\nAll dates are in 2009. The horizontal axis now shows the model’s numerical input, day of year.`,
      60, 615, 1160, 64, 22, C.muted);
  }
}
representation.push({ source: supplement('month_end_results', 'seasonal_fits.png').asset_path, represented_by: 'Four enlarged native fit plots' });

for (const city of ['Chicago', 'San Diego']) {
  const models = ['Linear regression', 'NN 5', 'NN 10', 'NN 20'];
  const s = appendix(`${city} full MAE comparison`, 'month_end_results/model_comparison.csv',
    'The original comparison includes the straight-line baseline and all three neural-network widths.');
  chart(s, ['Linear', '5 neurons', '10 neurons', '20 neurons'], [
    { name: 'Training', fill: C.blue, values: models.map(model => Number(monthly.find(x => x.City === city && x.Model === model)['Training MAE (C)'])) },
    { name: 'Validation', fill: C.orange, values: models.map(model => Number(monthly.find(x => x.City === city && x.Model === model)['Validation MAE (C)'])) },
  ], { left: 60, top: 145, width: 1160, height: 455 }, city === 'Chicago' ? 10 : 3.1, 'Model', 'MAE (C)');
  text(s, 'The same monthly 2009 split applies to every model. Lower MAE is better.\nThe straight-line baseline has no explicit seasonal sine or cosine features.', 60, 615, 1160, 64, 22, C.muted);
}
representation.push({ source: supplement('month_end_results', 'training_validation_mae.png').asset_path, represented_by: 'Two enlarged native city comparisons' });

for (const city of ['Chicago', 'San Diego']) {
  for (const width of [5, 10, 20]) {
    const rows = ensemblePredictions.filter(x => x.City === city && Number(x.Neurons) === width).map(x => ({
      ...x,
      'Upper (C)': Number(x['Ensemble (C)']) + Number(x['Member spread (C)']),
      'Lower (C)': Number(x['Ensemble (C)']) - Number(x['Member spread (C)']),
    }));
    const s = appendix(`${city}, ${width} neurons, ensemble`, 'week6_ensemble_results/predictions.csv',
      'The original mean-plus/minus-member-SD band is shown as upper and lower boundary curves. All numerical predictions and spreads are unchanged.');
    scatterPlot(s, city, [
      points('Training', rows.filter(x => x.Split === 'Training'), '#A9B2BA', 2),
      points('Validation', rows.filter(x => x.Split === 'Validation'), '#151C24', 3),
      curve('Seed 0', rows, 'Single (C)', C.orange),
      curve('Mean of 5', rows, 'Ensemble (C)', C.blue),
      curve('Mean + SD', rows, 'Upper (C)', '#8ABAD8', 1.6),
      curve('Mean - SD', rows, 'Lower (C)', '#8ABAD8', 1.6),
    ]);
    text(s, 'Light blue bounds equal the ensemble mean plus or minus one member standard deviation.\nThey measure disagreement between initializations and are not calibrated forecast intervals.',
      60, 615, 1160, 64, 22, C.muted);
  }
}
representation.push({ source: supplement('week6_ensemble_results', 'ensemble_comparison.png').asset_path, represented_by: 'Six enlarged native ensemble plots with spread boundaries' });

for (const city of ['Chicago', 'San Diego']) {
  for (const split of ['Training', 'Validation']) {
    const before = [5, 10, 20].map(width => regularization.find(x => x.City === city && Number(x.Neurons) === width && x.Version === 'Original'));
    const after = [5, 10, 20].map(width => regularization.find(x => x.City === city && Number(x.Neurons) === width && x.Version === 'Selected'));
    const s = appendix(`${city} ${split.toLowerCase()}, L2`, 'week6_regularization_results/comparison.csv',
      'Before already uses alpha 0.0001. After selects the lowest validation MAE at each width, including the original setting.');
    chart(s, ['5 neurons', '10 neurons', '20 neurons'], [
      { name: 'Original alpha 0.0001', fill: C.gray, values: before.map(x => Number(x[`${split} MAE (C)`])) },
      { name: 'Validation-selected alpha', fill: C.blue, values: after.map(x => Number(x[`${split} MAE (C)`])) },
    ], { left: 60, top: 145, width: 1160, height: 455 }, city === 'Chicago' ? 3.3 : 1.6, 'Hidden neurons', `${split} MAE (C)`);
    text(s, `Selected alpha for 5, 10 and 20 neurons: ${after.map(x => Number(x.Alpha).toString()).join(', ')}.\nIdentical pairs retain the original penalty. The validation data also choose the penalty.`,
      60, 615, 1160, 64, 22, C.muted);
  }
}
representation.push({ source: supplement('week6_regularization_results', 'before_after_l2.png').asset_path, represented_by: 'Four enlarged native before-and-after plots' });

for (const city of ['Chicago', 'San Diego']) {
  for (const width of [5, 10, 20]) {
    const selectedAlpha = Number(regularization.find(x => x.City === city && Number(x.Neurons) === width && x.Version === 'Selected').Alpha);
    const before = regularizationPredictions.filter(x => x.City === city && Number(x.Neurons) === width && Number(x.Alpha) === 0.0001);
    const after = regularizationPredictions.filter(x => x.City === city && Number(x.Neurons) === width && Number(x.Alpha) === selectedAlpha);
    const s = appendix(`${city}, ${width} neurons, L2 fits`, 'week6_regularization_results/predictions.csv',
      'Original versus validation-selected penalty. Points show exactly the same observations as in the original figure.');
    scatterPlot(s, city, [
      points('Training', before.filter(x => x.Split === 'Training'), '#A9B2BA', 2),
      points('Validation', before.filter(x => x.Split === 'Validation'), '#151C24', 3),
      curve('Original alpha 0.0001', before, 'Predicted (C)', C.orange),
      curve(`Selected alpha ${selectedAlpha}`, after, 'Predicted (C)', C.blue),
    ]);
    const interpretation = selectedAlpha === 0.0001
      ? 'Original alpha 0.0001 retained. The fitted curves are identical.'
      : city === 'Chicago'
        ? 'Alpha 0.1: fits look similar. Validation MAE improves by only 0.009 C.'
        : 'Alpha 0.001: validation MAE improves from 1.283 to 1.209 C.';
    text(s, `${interpretation}\nAll fits use 281 training days and 84 month-end validation days in 2009.`,
      60, 615, 1160, 64, 22, C.muted);
  }
}
representation.push({ source: supplement('week6_regularization_results', 'seasonal_comparison.png').asset_path, represented_by: 'Six enlarged native original-versus-selected fits' });
representation.push({ source: supplement('week6_regularization_results', 'alpha_validation_mae.png').asset_path, represented_by: 'Two enlarged native line charts on slide 8' });

const weatherDetails = JSON.parse(await fs.readFile(path.join(WORKSPACE, 'assets/comparison_details.json'), 'utf8')).details;
for (const detail of weatherDetails.filter(x => !/temperature/i.test(x.title))) {
  const precipitation = /precipitation/i.test(detail.title);
  const wind = /wind/i.test(detail.title);
  const note = precipitation ? 'The original precipitation scaling remains unvalidated as daily rainfall totals.'
    : wind ? 'Wind magnitude uses daily mean components, rather than mean hourly speed or gusts.'
      : 'The original pressure values are shown in hectopascals.';
  await appendixImage(detail, detail.title,
    `Blue: daily values. Orange: monthly means. Both cities cover 2009–2010.\n${note}`);
}
representation.push({ source: notebookFigure(59).asset_path, represented_by: 'Four enlarged variable rows, including the temperature row on slide 1' });

if (presentation.slides.items.length !== 36) throw new Error(`Expected36 slides, got${presentation.slides.items.length}`);
const allSources = [...inventory.notebook_images.filter(x => x.cell_index >= 59), ...inventory.supplemental_images];
const directSources = new Set(imageUsage.map(x => x.path));
const represented = new Set([...directSources, ...representation.map(x => x.source)]);
for (const source of allSources) if (!represented.has(source.asset_path)) throw new Error(`Missing source graph ${source.asset_path}`);
await fs.writeFile(path.join(WORKSPACE, 'deck_readability_coverage.json'), JSON.stringify({
  scope: 'Section 11, starting cell59, and later experiments', total_slides: 36, main_slides: 10,
  source_figure_count: 13, representation, direct_images: imageUsage, slides: slideManifest,
  native_chart_owner_slides: [...nativeChartOwners].sort((a,b) => a-b),
}, null, 2));

for (const [index, slide] of presentation.slides.items.entries()) {
  const png = await presentation.export({ slide, format: 'png', scale: 1.25 });
  await fs.writeFile(path.join(RENDERS, `slide-${String(index + 1).padStart(2, '0')}.png`),
    new Uint8Array(await png.arrayBuffer()));
  const layout = await slide.export({ format: 'layout' });
  await fs.writeFile(path.join(RENDERS, `slide-${String(index + 1).padStart(2, '0')}.json`), await layout.text());
  console.log(`Rendered slide ${index + 1}/${presentation.slides.items.length}`);
}
const candidatePath = path.join(BUILD, 'candidate-presentation.pptx');
await (await PresentationFile.exportPptx(presentation)).save(candidatePath);
const finalPath = path.join(OUTPUT, '290A_Chicago_San_Diego_Weather_Patterns_Presentation.pptx');
const result = await finalizePresentation({
  workspaceDir: WORKSPACE, candidatePath, finalPath,
  pythonExecutable: path.join(RUNTIME, 'dependencies/python/bin/python'),
  integrityValidatorPath: path.join(SKILL, 'container_tools/inspect_presentation_package_integrity.py'),
  layoutValidatorPath: path.join(SKILL, 'container_tools/inspect_presentation_layout_geometry.py'),
  layoutArgs: ['--expected-slide-size-emu', '12192000,6858000', '--validate-bullet-geometry', '--validate-heading-fit'],
  requiredNativeChartOwnerSlides: [...nativeChartOwners].sort((a,b) => a-b), requiredNativeTableOwnerSlides: [],
  materializeLiteralChartWorkbooks: true, nativeChartTargetApplication: 'powerpoint',
  fontPolicy: { basis: 'design', families: ['Arial'] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(BUILD, 'validation-presentation.json'),
});
await fs.writeFile(path.join(BUILD, 'finalizer-result.json'), JSON.stringify(result, null, 2));
await fs.copyFile(path.join(WORKSPACE, 'transcript_draft.md'), path.join(OUTPUT, 'Five_minute_presentation_transcript.md'));
console.log(`FINAL ${finalPath}`);
