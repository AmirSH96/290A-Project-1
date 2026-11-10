# Five-minute presentation transcript

Scope: Section 11 onward, starting with the Chicago and San Diego comparison.

10 main slides. Planned duration: 5:00. Approximately 675 spoken words (135 words per minute).

The appendix preserves supporting graphs for questions and is outside the timed presentation.

## Slide 1: Chicago and San Diego weather patterns (0:00–0:20)

I began by comparing Chicago and San Diego across temperature, precipitation, pressure, and wind. These plots use daily mean ERA5 data from 2009 and 2010 at the nearest grid point to each city. My initial goal was to identify clear differences before choosing a modeling question.

## Slide 2: Temperature variation and sample maxima (0:20–0:45)

Chicago showed much greater temperature variation: a standard deviation of about 10.9 degrees Celsius, compared with 2.8 in San Diego. The highest city daily means were about 28.3 degrees in Chicago and 24.6 in San Diego. These are maxima within this sample. That contrast led me to ask whether the same model settings would suit both cities.

## Slide 3: Stormiest-day exploration (0:45–1:10)

I also examined wind on March thirteenth, 2010, the day with the largest displayed regional precipitation value. This was exploratory. The regional average covers a rectangle rather than a United States land mask, and the precipitation scaling still needs validation as daily rainfall totals. This uncertainty limits rainfall conclusions, so I keep the final results focused on temperature.

## Slide 4: Predicting tomorrow’s temperature (1:10–1:40)

My first prediction experiment used current and lagged weather information to predict tomorrow’s temperature. I trained on the earlier seventy-five percent of dates and tested on the final quarter. Chicago’s linear regression and neural network both had average errors of about 1.46 degrees. In San Diego, linear regression scored 0.63, compared with 0.68 for the network. Greater model complexity did not automatically improve this forecast.

## Slide 5: Learning the seasonal temperature pattern (1:40–2:15)

I then changed the question: can a neural network learn the seasonal temperature pattern from day of year alone? I trained on 2009 and evaluated on 2010. Chicago’s average absolute error fell from 8.91 degrees for straight-line regression to 2.92 for the network. San Diego’s fell from 1.68 to 1.48. The network could represent the seasonal rise and fall that a straight line missed. This evaluates a different task from predicting tomorrow’s weather.

## Slide 6: Monthly validation and network width (2:15–2:55)

To choose network settings with coverage of every season, I held out the final seven days of each month in 2009. That gave 84 validation days and 281 training days. This asks how well the model fills gaps within one year, so its scores cannot be compared directly with the 2010 evaluation. I compared five, ten, and twenty neurons. Chicago’s lowest validation error was about 2.50 degrees with ten neurons. San Diego’s was about 1.18 with twenty. Better training fit did not consistently mean better validation predictions.

## Slide 7: Tuning the L2 weight penalty (2:55–3:30)

Week Six suggested controlling overfitting with regularization. I varied the L2 penalty, which discourages large weights, while keeping network size fixed. The original models already used a weak penalty. For San Diego’s ten-neuron model, increasing alpha from 0.0001 to 0.001 reduced validation error from 1.28 to 1.21 degrees, about six percent. Training error rose slightly, from 1.15 to 1.19. This helped a smaller model, while the original overall MAE winners remained unchanged.

## Slide 8: Sensitivity to penalty strength (3:30–3:55)

I scanned penalty strengths because more regularization is not always better. San Diego’s twenty-neuron model shows a spike in validation error at alpha 0.01, followed by lower errors. Changing the penalty can lead training to different fits, and initialization matters. This shows sensitivity to settings, rather than a rule that twenty neurons always performs poorly.

## Slide 9: Testing a five-network ensemble (3:55–4:20)

I averaged five networks with different initial weights to test whether predictions became more reliable. The ensemble did not beat either city’s original winner. Some weaker fits pulled the mean away from better solutions. In the appendix plots, the light blue boundaries show disagreement between fits. They are not calibrated intervals for future temperatures.

## Slide 10: Results and limits of the analysis (4:20–5:00)

The comparison shows that model choices depend on the city and the prediction question. Our earlier forecast had only one chronological test split. The later monthly and L2 experiments used one training year, and validation both selected settings and measured their performance. Nearby days are related, and training includes later dates. Those results do not establish future forecasting improvement. With only calendar input and one seed for the L2 scan, I would next repeat initializations, evaluate untouched years, and compare a seasonal baseline using sine and cosine features.
