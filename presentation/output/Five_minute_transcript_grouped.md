# Five-minute presentation transcript

Scope: Section 11 onward. Each of the 13 slides preserves an original graph grouping.

Planned duration: 5:00. Approximately 668 spoken words (134 words per minute).

## Slide 1: Chicago and San Diego weather comparison (0:00–0:20)

I began by comparing Chicago and San Diego across temperature, precipitation, pressure, and wind. These graphs cover daily mean ERA5 data from 2009 and 2010 at the nearest grid point to each city. I explored their patterns before choosing a modeling question.

## Slide 2: Temperature patterns and sample maxima (0:20–0:45)

Chicago showed greater temperature variation: a standard deviation of about 10.9 degrees Celsius, compared with 2.8 in San Diego. The highest city daily means were about 28.3 degrees in Chicago and 24.6 in San Diego. These are sample maxima. Two years of data do not establish a long-term climate trend.

## Slide 3: Exploring a precipitation event (0:45–1:05)

I also examined wind on the day with the largest displayed regional precipitation value. The average covers a rectangular study region, and the precipitation scaling needs validation as daily rainfall totals. This uncertainty limits rainfall conclusions, so I keep the final results focused on temperature.

## Slide 4: Predicting tomorrow’s temperature (1:05–1:35)

I used current and lagged weather information to predict tomorrow’s temperature. I trained on the earlier seventy-five percent of dates and tested on the final quarter. Chicago’s linear regression and neural network both had average errors of about 1.46 degrees. San Diego’s linear model scored 0.63, compared with 0.68 for the network. Complexity did not automatically improve this forecast, which used one chronological test split.

## Slide 5: Chicago seasonal prediction (1:35–1:55)

I then asked whether day of year alone could capture the seasonal pattern. In Chicago, I trained on 2009 and evaluated on 2010. The neural network represented the seasonal rise and fall better than a straight line, reducing average absolute error from 8.91 to 2.92 degrees.

## Slide 6: San Diego seasonal prediction (1:55–2:10)

I repeated the same seasonal experiment for San Diego. Error fell from 1.68 degrees with straight-line regression to 1.48 with the network. Its advantage was smaller here, showing why both cities needed evaluation.

## Slide 7: Seasonal prediction in both cities (2:10–2:25)

This combined view brings the previous two city comparisons together. It shows the same experiment, rather than an additional independent test. The network improves both cities’ seasonal predictions, with a much larger gain in Chicago.

## Slide 8: Monthly validation: 5, 10 and 20 neurons (2:25–2:55)

To choose network settings across all seasons, I held out the final seven days of each month in 2009. That gave 84 validation days and 281 training days. The curves compare five, ten, and twenty neurons on identical dates. This asks how well models fill gaps within one year. Training includes later and neighboring days, so these scores cannot be compared directly with the earlier 2010 evaluation.

## Slide 9: Training and validation errors (2:55–3:25)

The bars make the training and validation tradeoff clearer. More neurons improved training fit, but did not consistently improve validation predictions. Chicago’s lowest validation error was about 2.50 degrees with ten neurons, although twenty was nearly tied. San Diego’s was about 1.18 with twenty. I selected using validation error. These results describe one initialization and do not establish a universally best network size.

## Slide 10: Comparing single networks and ensembles (3:25–3:45)

I averaged five networks with different initial weights to test whether predictions became more reliable. The ensemble did not beat either city’s original winner. Some weaker fits pulled the mean away from better solutions. The shaded band shows initialization disagreement, not a calibrated interval for future temperatures.

## Slide 11: Effect of L2 penalty strength (3:45–4:10)

Week Six suggested regularization. Alpha controls the L2 penalty on large weights. I compared six penalty strengths at each network size. Validation error did not decrease steadily. San Diego’s twenty-neuron model spiked at alpha 0.01. Different penalties can lead training to different fits, so one spike does not show that twenty neurons always performs poorly.

## Slide 12: Seasonal fits before and after L2 tuning (4:10–4:30)

These panels compare each original fit with its validation-selected penalty. The original models already used weak L2 regularization. Four of the six models kept that original setting, so their curves overlap. Stronger regularization did not consistently improve every model.

## Slide 13: Before and after L2: error comparison (4:30–5:00)

The clearest change was San Diego’s ten-neuron model: validation error fell from 1.28 to 1.21 degrees, about six percent, while training error rose slightly. The original overall MAE winners stayed unchanged. These later experiments use one training year, calendar input, and validation data to both choose and score settings. They do not establish improved future forecasting. I would next repeat initializations and evaluate untouched years.
