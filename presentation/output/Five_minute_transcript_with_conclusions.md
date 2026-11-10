# Five-minute presentation transcript

Scope: Section 11 onward. Slides 1–13 preserve the original graph groupings. Slides 14–15 conclude the analysis.

Planned duration: 5:00. Approximately 658 spoken words (132 words per minute).

## Slide 1: Chicago and San Diego weather comparison (0:00–0:15)

I began by comparing Chicago and San Diego across temperature, precipitation, pressure, and wind. I used ERA5 daily means from 2009 and 2010 at the nearest grid points, exploring patterns before choosing a modeling question.

## Slide 2: Temperature patterns and sample maxima (0:15–0:35)

Chicago showed much greater temperature variation: a standard deviation of about 10.9 degrees Celsius, compared with 2.8 in San Diego. The highest city daily means were about 28.3 and 24.6 degrees. These are sample maxima, and two years do not establish a climate trend.

## Slide 3: Exploring a precipitation event (0:35–0:50)

I examined wind on the day with the largest displayed regional precipitation value. That average covers a rectangular study region. The precipitation scaling still needs validation as daily rainfall totals, which limits the rainfall conclusions.

## Slide 4: Predicting tomorrow’s temperature (0:50–1:15)

I first used current and lagged weather to predict tomorrow’s temperature, training on the earlier seventy-five percent of dates. Chicago’s linear and neural models both scored about 1.46 degrees. San Diego’s linear model scored 0.63, compared with 0.68 for the network. This used one chronological test split.

## Slide 5: Chicago seasonal prediction (1:15–1:30)

I then asked whether day of year alone could capture the seasonal pattern. Training on 2009 and evaluating on 2010, Chicago’s error fell from 8.91 degrees with a straight line to 2.92 with the network.

## Slide 6: San Diego seasonal prediction (1:30–1:45)

I repeated the seasonal experiment for San Diego. Error fell from 1.68 degrees with the straight line to 1.48 with the network. The improvement was smaller here.

## Slide 7: Seasonal prediction in both cities (1:45–1:55)

This combined view shows the same seasonal experiment as the previous two slides. It makes the larger improvement in Chicago easier to compare.

## Slide 8: Monthly validation: 5, 10 and 20 neurons (1:55–2:20)

To compare network settings across all seasons, I held out the final seven days of every month in 2009. That left 281 training days and 84 validation days. These curves compare five, ten, and twenty neurons on identical dates. This changes the evaluation question, so lower errors cannot be compared directly with the 2010 results.

## Slide 9: Training and validation errors (2:20–2:40)

The bars compare training and validation error. More neurons improved training fit, but did not consistently improve validation. Chicago’s lowest validation error was about 2.50 degrees with ten neurons, almost tied with twenty. San Diego’s was about 1.18 with twenty. I chose settings using validation error.

## Slide 10: Comparing single networks and ensembles (2:40–2:55)

I averaged five networks with different initial weights to test whether predictions became more reliable. The ensemble did not lower either city’s best single-model MAE. The shaded spread shows disagreement between fits, not calibrated weather uncertainty.

## Slide 11: Effect of L2 penalty strength (2:55–3:15)

I also tested six L2 penalty strengths. Alpha penalizes large weights, but stronger penalties did not steadily lower validation error. San Diego’s twenty-neuron model spiked at one setting. Different penalties can lead training to different fits, and initialization can change the ranking.

## Slide 12: Seasonal fits before and after L2 tuning (3:15–3:30)

These panels compare original fits with their validation-selected penalties. The originals already used weak L2 regularization. Four models kept their original setting, so their curves overlap. Stronger penalties did not consistently improve every model.

## Slide 13: Before and after L2: error comparison (3:30–3:50)

The clearest L2 change was San Diego’s ten-neuron network. Validation error fell from about 1.28 to 1.21 degrees, while training error rose slightly. A closer training fit was therefore unnecessary for better predictions on these held-out weeks.

## Slide 14: Conclusions: what we tested and learned (3:50–4:25)

The results depend on the task and city. Chicago showed stronger seasonal variability. The neural network learned seasonal curvature better than a straight line, but did not consistently improve the next-day forecast. Monthly validation selected ten neurons for Chicago and twenty for San Diego. L2 reduced San Diego’s ten-neuron validation MAE by about 5.8 percent, but the lowest-MAE overall choices stayed unchanged. Ensembles also failed to beat the best single-model MAE.

## Slide 15: Limitations and future exploration (4:25–5:00)

The monthly results reconstruct 2009 gaps. One training year and one L2 initialization limit robustness. Reusing validation for selection and reporting, alongside related neighboring days, requires a separate final test. I would repeat seeds, use untouched years, and evaluate forecasts chronologically. Calendar-only inputs and the weak straight-line baseline motivate sine and cosine features and richer weather predictors. Two years cannot establish climate trends, and rainfall totals need unit checks. Longer records would strengthen these conclusions.
