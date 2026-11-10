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
const RENDERS = path.join(BUILD, 'renders-final');
await fs.mkdir(RENDERS, { recursive: true });
await fs.mkdir(OUTPUT, { recursive: true });

async function csv(relativePath) {
  const lines = (await fs.readFile(path.join(PROJECT, relativePath), 'utf8')).trim().split(/\r?\n/);
  const keys = lines.shift().split(',');
  return lines.map(line => Object.fromEntries(line.split(',').map((value, index) => [keys[index], value])));
}
const monthly = await csv('month_end_results/model_comparison.csv');
const regularization = await csv('week6_regularization_results/comparison.csv');
const ensembles = await csv('week6_ensemble_results/scores.csv');

const presentation = Presentation.create({ slideSize: { width: 1280, height: 720 } });
const C = { ink: '#17324A', blue: '#2375A6', orange: '#D77D35', gray: '#B9C2CC', muted: '#596C7D', amber: '#996013' };
const imageUsage = [];
const used = new Set();
const slideManifest = [];

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
  return result;
}

// Main slides cover Section 11 onward only.
{
  const s = newSlide('Chicago and San Diego weather patterns', mainNotes(1),
    'ERA5 course data, 2009–2010. Notebook Section 11, cell 59.');
  text(s, 'How do the cities differ?\nWhich temperature models\nwork best for each city?', 60, 176, 490, 160, 33, C.ink, true);
  text(s, '730 daily means across 2009–2010\nNearest ERA5 grid point to each city', 60, 380, 490, 98, 25, C.muted);
  text(s, 'Initial exploration included temperature,\nprecipitation, pressure and wind.', 60, 506, 510, 84, 25);
  text(s, 'Daily rainfall totals need a unit check.', 60, 616, 520, 40, 21, C.amber);
  await image(s, notebookFigure(59), { left: 600, top: 132, width: 620, height: 520 });
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
  text(s, 'The largest supplied\nregional precipitation value\nselected this day.', 880, 298, 340, 135, 25);
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
    'Saved notebook cell 64 results. Train on 2009, evaluate on 2010.');
  await image(s, notebookFigure(64), { left: 60, top: 138, width: 800, height: 490 });
  text(s, 'Input: day of year\nTarget: that day’s temperature', 900, 145, 320, 100, 26, C.ink, true);
  text(s, '2010 MAE\nStraight line to 10-neuron NN', 900, 280, 320, 90, 25, C.muted);
  text(s, 'Chicago\n8.91 to 2.92 C', 900, 386, 320, 90, 30, C.blue, true);
  text(s, 'San Diego\n1.68 to 1.48 C', 900, 510, 320, 90, 30, C.orange, true);
  text(s, 'The calendar-only model learns seasonal shape. It does not use recent weather.',
    60, 635, 1160, 40, 22, C.muted);
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
    'week6_regularization_results/alpha_validation_mae.png. One initialization per point.');
  await image(s, supplement('week6_regularization_results', 'alpha_validation_mae.png'),
    { left: 60, top: 160, width: 1160, height: 402 });
  text(s, 'Stronger penalties do not steadily improve validation MAE.', 60, 590, 1160, 44, 28, C.ink, true);
  text(s, 'The San Diego spike shows sensitivity of the fitted solution. A single curve does not establish a universal ranking.',
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

// Preserve every source graph in scope, including alternative views, exactly once.
const sourceGraphs = [
  ...inventory.notebook_images.filter(x => x.cell_index >= 59),
  ...inventory.supplemental_images,
];
const appendixCaptions = {
  'month_end_results/seasonal_fits.png': '2009 monthly holdout. The fitted curves use 281 training days and score 84 withheld days.',
  'month_end_results/training_validation_mae.png': 'Original monthly comparison, including the straight-line baseline. Calendar-only seasonal reconstruction.',
  'week6_ensemble_results/ensemble_comparison.png': 'The band shows mean plus or minus one member SD. It is not a calibrated forecast interval.',
  'week6_regularization_results/before_after_l2.png': 'Before already uses alpha 0.0001. Four selected settings retain that original penalty.',
  'week6_regularization_results/seasonal_comparison.png': 'Each width compares the original penalty with a penalty selected using validation MAE.',
};
let appendixNumber = 0;
for (const entry of sourceGraphs) {
  if (used.has(entry.asset_path)) continue;
  appendixNumber += 1;
  const rel = path.relative(PROJECT, entry.asset_path);
  let label = entry.title;
  let caption = entry.cell_index === 63 ? 'Alternative view of the same 2009 training and 2010 seasonal evaluation shown in slide 5.' : appendixCaptions[rel];
  if (!label) {
    const labels = {
      'month_end_results/seasonal_fits.png': 'Monthly seasonal fits',
      'month_end_results/training_validation_mae.png': 'Full monthly MAE comparison',
      'week6_ensemble_results/ensemble_comparison.png': 'Ensemble fits and member spread',
      'week6_regularization_results/before_after_l2.png': 'Full L2 before-and-after comparison',
      'week6_regularization_results/seasonal_comparison.png': 'Original and selected L2 fits',
    };
    label = labels[rel] ?? entry.asset_filename;
  }
  const source = entry.cell_index !== undefined
    ? `Original notebook cell ${entry.cell_index}, output ${entry.output_index}. Figure preserved in full.`
    : rel;
  const s = newSlide(`Appendix ${appendixNumber}: ${label}`, caption ?? label, source, true);
  await image(s, entry, { left: 60, top: 132, width: 1160, height: 480 });
  text(s, caption ?? '', 60, 630, 1160, 46, 21, C.muted);
}

if (sourceGraphs.length !== 13 || imageUsage.length !== 13 || used.size !== 13) {
  throw new Error(`Figure coverage error: expected13, sources=${sourceGraphs.length}, used=${used.size}`);
}
const details = JSON.parse(await fs.readFile(path.join(WORKSPACE, 'assets/comparison_details.json'), 'utf8')).details;
for (const entry of details) {
  appendixNumber += 1;
  const precipitation = /precipitation/i.test(entry.title);
  const wind = /wind/i.test(entry.title);
  const detailNote = precipitation
    ? 'Original precipitation scaling retained. Daily rainfall totals remain unvalidated.'
    : wind
      ? 'Wind magnitude uses daily mean horizontal components, rather than mean hourly speed or gusts.'
      : 'Enlarged complete variable row from the original Section 11 city comparison, 2009–2010.';
  const caption = `Blue: daily values. Orange: monthly means. All series cover 2009–2010.\n${detailNote}`;
  const s = newSlide(`Appendix ${appendixNumber}: ${entry.title}`, caption,
    'Detail from notebook cell 59. Both city panels and their original axes are preserved.', true);
  await image(s, entry, { left: 60, top: 154, width: 1160, height: 440 });
  imageUsage[imageUsage.length - 1].derivative_of = entry.derived_from;
  text(s, caption, 60, 618, 1160, 56, 21, precipitation ? C.amber : C.muted);
}
if (presentation.slides.items.length !== 21) throw new Error('Expected10 main slides plus11 appendix slides');
await fs.writeFile(path.join(WORKSPACE, 'deck_coverage.json'), JSON.stringify({
  scope: 'Section 11, starting notebook cell 59, and later experiments',
  total_slides: presentation.slides.items.length, main_slides: 10,
  source_figure_count: sourceGraphs.length, images: imageUsage, slides: slideManifest,
}, null, 2));

for (const [index, slide] of presentation.slides.items.entries()) {
  const png = await presentation.export({ slide, format: 'png', scale: 1.25 });
  await fs.writeFile(path.join(RENDERS, `slide-${String(index + 1).padStart(2, '0')}.png`),
    new Uint8Array(await png.arrayBuffer()));
  const layout = await slide.export({ format: 'layout' });
  await fs.writeFile(path.join(RENDERS, `slide-${String(index + 1).padStart(2, '0')}.json`), await layout.text());
  console.log(`Rendered slide ${index + 1}/${presentation.slides.items.length}`);
}
const candidatePath = path.join(BUILD, 'candidate-final.pptx');
await (await PresentationFile.exportPptx(presentation)).save(candidatePath);
const finalPath = path.join(OUTPUT, '290A_Chicago_San_Diego_Weather_Patterns_Final.pptx');
const result = await finalizePresentation({
  workspaceDir: WORKSPACE, candidatePath, finalPath,
  pythonExecutable: path.join(RUNTIME, 'dependencies/python/bin/python'),
  integrityValidatorPath: path.join(SKILL, 'container_tools/inspect_presentation_package_integrity.py'),
  layoutValidatorPath: path.join(SKILL, 'container_tools/inspect_presentation_layout_geometry.py'),
  layoutArgs: ['--expected-slide-size-emu', '12192000,6858000', '--validate-bullet-geometry', '--validate-heading-fit'],
  requiredNativeChartOwnerSlides: [6, 7, 9], requiredNativeTableOwnerSlides: [],
  materializeLiteralChartWorkbooks: true, nativeChartTargetApplication: 'powerpoint',
  fontPolicy: { basis: 'design', families: ['Arial'] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(BUILD, 'validation-final.json'),
});
await fs.writeFile(path.join(BUILD, 'finalizer-result.json'), JSON.stringify(result, null, 2));
await fs.copyFile(path.join(WORKSPACE, 'transcript_draft.md'), path.join(OUTPUT, 'Five_minute_presentation_transcript.md'));
console.log(`FINAL ${finalPath}`);
