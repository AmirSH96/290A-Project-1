import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const ROOT = '/Users/amirsh96/290A/Project 1';
const WORK = path.join(ROOT, 'presentation');
const RUNTIME = '/Users/amirsh96/.cache/codex-runtimes/codex-primary-runtime';
const SKILL = '/Users/amirsh96/.codex/plugins/cache/openai-primary-runtime/presentations/26.1104.22356/skills/presentations';
const require = createRequire(path.join(RUNTIME, 'dependencies/node/node_modules/__runtime__.cjs'));
const { Presentation, PresentationFile } = await import(pathToFileURL(require.resolve('@oai/artifact-tool')).href);
const { finalizePresentation } = await import(pathToFileURL(path.join(SKILL, 'container_tools/artifact_tool_utils.mjs')).href);
const sharp = require('sharp');
const inventory = JSON.parse(await fs.readFile(path.join(WORK, 'notebook_graph_inventory.json'), 'utf8'));
const story = JSON.parse(await fs.readFile(path.join(WORK, 'storyboard_grouped.json'), 'utf8'));
const BUILD = path.join(WORK, '.build/grouped-conclusions');
const RENDERS = path.join(BUILD, 'renders');
await fs.mkdir(RENDERS, { recursive: true });

function nb(cell, output = null) {
  return inventory.notebook_images.find(x => x.cell_index === cell && (output === null || x.output_index === output));
}
function sup(folder, filename) {
  return inventory.supplemental_images.find(x => x.source_folder === folder && x.asset_filename === filename);
}
const slides = [
  ['Chicago and San Diego weather comparison', nb(59), 'Daily values and monthly means, 2009–2010. Precipitation totals remain unvalidated.'],
  ['Temperature patterns and sample maxima', nb(60), 'Chicago varies more. “US average” refers to the rectangular study-region average.'],
  ['Exploring a precipitation event', nb(61), '13 March 2010 has the largest supplied regional precipitation value. Daily rainfall totals need validation.'],
  ['Predicting tomorrow’s temperature', nb(62), 'Chronological 75/25 split. The neural network does not consistently beat linear regression.'],
  ['Chicago seasonal prediction', nb(63, 0), 'Train on 2009, evaluate on 2010. Chicago MAE: straight line 8.91 C, neural network 2.92 C.'],
  ['San Diego seasonal prediction', nb(63, 1), 'The same annual split. San Diego MAE: straight line 1.68 C, neural network 1.48 C.'],
  ['Seasonal prediction in both cities', nb(64), 'The same experiment as the previous two slides, with both cities and both years shown together.'],
  ['Monthly validation: 5, 10 and 20 neurons', sup('month_end_results', 'seasonal_fits.png'), '2009: 281 training days and 84 validation days, holding out the final seven days of each month.'],
  ['Training and validation errors', sup('month_end_results', 'training_validation_mae.png'), 'Validation MAE selects 10 neurons in Chicago (2.498 C) and 20 in San Diego (1.183 C).'],
  ['Comparing single networks and ensembles', sup('week6_ensemble_results', 'ensemble_comparison.png'), 'Five seeds did not beat the original winners. The band shows member disagreement, not forecast confidence.'],
  ['Effect of L2 penalty strength', sup('week6_regularization_results', 'alpha_validation_mae.png'), 'Stronger penalties do not steadily lower validation error. The penalty scan uses one initialization.'],
  ['Seasonal fits before and after L2 tuning', sup('week6_regularization_results', 'seasonal_comparison.png'), 'Original alpha 0.0001 versus validation-selected alpha. Four models retain their original penalty.'],
  ['Before and after L2: error comparison', sup('week6_regularization_results', 'before_after_l2.png'), 'San Diego, 10 neurons: validation MAE improves 5.8%. Training error rises slightly. Overall winners stay unchanged.'],
];
const presentation = Presentation.create({ slideSize: { width: 1280, height: 720 } });
const imageUsage = [];

function text(slide, value, position, fontSize, color, bold = false, alignment = 'left') {
  const shape = slide.shapes.add({ geometry: 'textbox', position, fill: 'none', line: { fill: 'none', width: 0 } });
  shape.text = value;
  shape.text.style = { typeface: 'Arial', fontSize, color, bold, alignment, wrap: 'square', insets: 0, autoFit: 'none' };
}

for (const [index, [title, figure, caption]] of slides.entries()) {
  if (!figure) throw new Error(`Missing original figure for slide ${index + 1}`);
  if (story.slides[index].title !== title) throw new Error(`Slide ${index + 1} title does not match the transcript`);
  const slide = presentation.slides.add();
  slide.background.fill = '#FFFFFF';
  text(slide, title, { left: 36, top: 25, width: 1208, height: 60 }, 42, '#17324A', true);
  const bytes = await fs.readFile(figure.asset_path);
  const dimensions = await sharp(bytes).metadata();
  const frame = { left: 36, top: 100, width: 1208, height: 535 };
  const scale = Math.min(frame.width / dimensions.width, frame.height / dimensions.height);
  const width = dimensions.width * scale;
  const height = dimensions.height * scale;
  slide.images.add({
    blob: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), contentType: 'image/png',
    alt: title, fit: 'contain',
    position: { left: frame.left + (frame.width - width) / 2, top: frame.top + (frame.height - height) / 2, width, height },
  });
  text(slide, caption, { left: 36, top: 650, width: 1208, height: 43 }, 20, '#435B6F');
  text(slide, String(index + 1), { left: 1192, top: 696, width: 52, height: 18 }, 13, '#596C7D', false, 'right');
  slide.speakerNotes.text = `${story.slides[index].notes}\n\nSource: ${path.relative(ROOT, figure.asset_path)}\nOriginal notebook panel arrangement preserved.\nPlanned narration: ${story.slides[index].seconds} seconds.`;
  imageUsage.push({ slide: index + 1, title, source: figure.asset_path, sha256: figure.sha256 });
}

function closingSlide(number, title) {
  if (story.slides[number - 1]?.title !== title) throw new Error(`Closing slide ${number} title does not match the transcript`);
  const slide = presentation.slides.add();
  slide.background.fill = '#FFFFFF';
  text(slide, title, { left: 36, top: 25, width: 1208, height: 60 }, 42, '#17324A', true);
  text(slide, String(number), { left: 1192, top: 696, width: 52, height: 18 }, 13, '#596C7D', false, 'right');
  slide.speakerNotes.text = `${story.slides[number - 1].notes}\n\nSources: notebook cells 59 and 62–64; month_end_results/model_comparison.csv; week6_ensemble_results/scores.csv; week6_regularization_results/comparison.csv.\nPlanned narration: ${story.slides[number - 1].seconds} seconds.`;
  return slide;
}

const conclusions = closingSlide(14, 'Conclusions: what we tested and learned');
text(conclusions, 'How do the cities differ, and which temperature models work best?',
  { left: 48, top: 112, width: 1184, height: 78 }, 32, '#17324A');
const findingRows = [
  ['City patterns', 'Chicago varied more. Networks learned seasonal curves better than straight lines, but did not consistently improve tomorrow’s forecasts.'],
  ['Network size', 'Monthly validation favored 10 neurons in Chicago and 20 in San Diego. More neurons did not consistently improve accuracy.'],
  ['L2 and ensembles', 'L2 reduced San Diego’s 10-neuron validation error by 5.8%. The overall MAE winners stayed unchanged, and ensembles did not beat them.'],
];
for (const [i, [label, body]] of findingRows.entries()) {
  const top = 220 + i * 125;
  text(conclusions, label, { left: 48, top, width: 262, height: 74 }, 28, '#23799B', true);
  text(conclusions, body, { left: 330, top, width: 902, height: 105 }, 28, '#17324A');
}
text(conclusions, 'Why: flexible curves capture seasonality. A small penalty can reduce overfitting, but added complexity offers no guaranteed gain.',
  { left: 48, top: 610, width: 1184, height: 67 }, 25, '#435B6F');

const limitations = closingSlide(15, 'Limitations and future exploration');
text(limitations, 'Limitations', { left: 48, top: 118, width: 550, height: 48 }, 32, '#23799B', true);
text(limitations, 'Future exploration', { left: 658, top: 118, width: 574, height: 48 }, 32, '#23799B', true);
const nextSteps = [
  ['L2 tuning uses 2009 and one initialization.', 'Repeat multiple initializations and evaluate untouched years.'],
  ['The same validation weeks select settings and report accuracy. Nearby days are related.', 'Keep a separate final test period. Use chronological evaluation for future forecasts.'],
  ['Day of year misses daily weather. A straight line is a weak seasonal baseline.', 'Compare a sine/cosine seasonal baseline and add recent weather predictors.'],
  ['Two years limit climate claims. Daily rainfall totals remain unvalidated.', 'Study longer records and verify precipitation units before rainfall conclusions.'],
];
for (const [i, [limit, next]] of nextSteps.entries()) {
  const top = 190 + i * 119;
  text(limitations, limit, { left: 48, top, width: 548, height: 108 }, 27, '#17324A');
  text(limitations, next, { left: 658, top, width: 574, height: 108 }, 27, '#17324A');
}

if (presentation.slides.items.length !== 15 || story.slides.length !== 15 || new Set(imageUsage.map(x => x.source)).size !== 13) throw new Error('Expected 13 original figure groups followed by two conclusion slides');
for (const [index, slide] of presentation.slides.items.entries()) {
  const png = await presentation.export({ slide, format: 'png', scale: 1.25 });
  await fs.writeFile(path.join(RENDERS, `slide-${String(index + 1).padStart(2, '0')}.png`), new Uint8Array(await png.arrayBuffer()));
  console.log(`Rendered ${index + 1}/15`);
}
const candidatePath = path.join(BUILD, 'candidate.pptx');
await (await PresentationFile.exportPptx(presentation)).save(candidatePath);
const finalPath = path.join(WORK, 'output/290A_Weather_Side_by_Side_Conclusions.pptx');
await finalizePresentation({
  workspaceDir: WORK, candidatePath, finalPath,
  pythonExecutable: path.join(RUNTIME, 'dependencies/python/bin/python'),
  integrityValidatorPath: path.join(SKILL, 'container_tools/inspect_presentation_package_integrity.py'),
  layoutValidatorPath: path.join(SKILL, 'container_tools/inspect_presentation_layout_geometry.py'),
  layoutArgs: ['--expected-slide-size-emu', '12192000,6858000', '--validate-heading-fit'],
  requiredNativeChartOwnerSlides: [], requiredNativeTableOwnerSlides: [],
  fontPolicy: { basis: 'design', families: ['Arial'] }, verifyArtifactToolImport: true,
  receiptPath: path.join(BUILD, 'validation.json'),
});
await fs.writeFile(path.join(WORK, 'grouped_graph_coverage.json'), JSON.stringify({ slide_count: 15, original_figure_groups: imageUsage, closing_slides: [14, 15] }, null, 2));
await fs.copyFile(path.join(WORK, 'transcript_grouped.md'), path.join(WORK, 'output/Five_minute_transcript_with_conclusions.md'));
console.log(`FINAL ${finalPath}`);
