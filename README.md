# Chicago and San Diego Weather Comparison

This project compares weather patterns in Chicago and San Diego and tests how neural-network width and L2 regularization affect seasonal temperature estimates. The analysis appears after Section 11 in [weather_era5_xarray.ipynb](weather_era5_xarray.ipynb).
[Presentation Link](https://your-presentation-url.com)

## Data and analysis

The supplied ERA5 daily-mean NetCDF files cover 2009–2010. City temperatures use the nearest grid points: Chicago (42.0, -87.5) and San Diego (32.75, -117.25), converted from kelvin to Celsius.

The analysis:

- Compares daily values and monthly means for temperature, precipitation, sea-level pressure, and wind speed, using matched scales between cities.
- Identifies the warmest dates for each city and the latitude-weighted study region, then maps pressure and wind on the date with the highest regional precipitation value.
- Compares a straight-line day-of-year baseline with a neural network trained on 2009 and evaluated on 2010. A subsequent trial compares network widths using a chronological 80/20 split within 2009.
- Uses month-end holdouts to compare network widths and tune L2 regularization in the latest experiments.

## Latest experiment and results

Only 2009 is used: **281 training days and 84 validation days**, with the final seven calendar days of each month held out. Day of year is the only input; temperature is the target.

The neural networks have one ReLU hidden layer with 5, 10, or 20 neurons. Input and target standardization are fitted on training data only. Fits use L-BFGS, random seed 0, and an initial L2 penalty of `alpha = 0.0001`. MAE, RMSE, and R² are recorded for training and validation.

Validation mean absolute error (MAE), in °C; lower is better:

| Model | Chicago | San Diego |
|---|---:|---:|
| Linear regression | 8.886 | 2.509 |
| 5-neuron network | 2.686 | 1.334 |
| 10-neuron network | **2.498** | 1.283 |
| 20-neuron network | 2.514 | **1.183** |

L2 penalties of `0.0001`, `0.001`, `0.01`, `0.1`, `1`, and `10` were compared separately for each city and width. San Diego's 10-neuron network improved from **1.283°C to 1.209°C** validation MAE (**5.8%**) at `alpha = 0.001`. Chicago's improvement was negligible. The original best models remained best overall: **10 neurons for Chicago and 20 for San Diego**.

## Interpretation and limitations

The month-end experiments evaluate withheld temperatures within 2009. Training includes dates after most validation periods, and the same validation weeks select widths and penalties. These are exploratory seasonal-fit results, not an independent test of improved forecasting. The latest comparison uses one year, one seed, and no weather inputs beyond the calendar.

Regional averages cover the full rectangular study grid, without a US boundary or land mask. Precipitation aggregation and its `mm/day` label still require verification; quantitative rainfall totals are not established here.

## Running the analysis

Open the notebook from the project directory with the course `290A` environment and the supplied `data/` folders. Dependencies are NumPy, pandas, xarray, netCDF4, dask, Matplotlib, scikit-learn, and Jupyter. The latest model results were reproduced with scikit-learn 1.7.2.

For the latest experiments:

1. Run the self-contained cell beginning `Compare 5-, 10-, and 20-neuron seasonal temperature models in 2009`.
2. Run the later 2009 temperature-loading cell, then the L2 comparison cell defining `alphas`, then the before/after chart cell.
3. Before running the loader and chart cells, update their absolute `data_dir` and `output_dir` paths for your machine.

Earlier analyses require the starter setup cells. To run the full notebook, execute the scikit-learn imports from the month-end comparison cell before the first modeling cell. A full clean-kernel notebook run has not been verified.

## Saved results

- [Network-width scores](month_end_results/model_comparison.csv) and [training/validation chart](month_end_results/training_validation_mae.png).
- [L2 comparison scores](week6_regularization_results/comparison.csv), [before/after chart](week6_regularization_results/before_after_l2.png), and [detailed interpretation](week6_regularization_results/before_after_l2_summary.md).
