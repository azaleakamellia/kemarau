/*<-------MODIS Land Surface Temperature Data-----------
This code is developed to download the MODIS Land Surface Temperature data from the Google Earth Engine Platform.
The code is applicable for the following data:
1) MODIS/061/MOD11A1 -- MOD11A1.061 Terra Land Surface Temperature and Emissivity Daily Global (1km)
    >> https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MOD11A1
2) MODIS/061/MYD11A1 -- MYD11A1.061 Aqua Land Surface Temperature and Emissivity Daily Global (1km)
    >> https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MYD11A1 

The data extracted will be data in the form of CSV file and 4 columns; date, longitude, latitude, temperature in Kelvin and 
temperature in Celsius
-------------------------------------------------------->*/

// Define region of interest that has already been uploaded as your own personal asset in Google Earth Engine
var roi = ee.FeatureCollection(table);

// Define date range
var startDate = '2023-01-01';
var endDate = ee.Date(Date.now()); // This places the date range up to current date

// Load the MODIS LST collection and filter it
var modisLSTCollection = ee.ImageCollection('MODIS/061/MYD11A1')
  .filterDate(startDate, endDate)
  .filterBounds(roi)
  .select(['LST_Day_1km'])
  .map(function(image) {
    // Reproject each image to EPSG:4326 to ensure alignment
    return image.reproject('EPSG:4326', null, 1000);
  });


// Sample points within the ROI for each image
var samples = modisLSTCollection.map(function(image) {
  return image.sample({
    region: roi,
    scale: 1000,
    projection: 'EPSG:4326',
    geometries: true // Include longitude and latitude in the result
  }).map(function(feature) {
    // Extract coordinates from the geometry and set them as properties
    var coords = feature.geometry().coordinates();
    var lstKelvin = ee.Number(feature.get('LST_Day_1km')).multiply(0.02);
    var lstCelsius = lstKelvin.subtract(273.15); // Convert to Celsius
    return feature.set({
      'date': ee.Date(image.get('system:time_start')).format('YYYY-MM-dd'),
      'longitude': coords.get(0),
      'latitude': coords.get(1),
      // Convert LST from Kelvin (default scaling factor: 0.02)
      'LST_Day_1km_K': lstKelvin,
      'LST_Day_1km_C': lstCelsius
    });
  });
}).flatten();

// Set up export task to CSV, including date, longitude, latitude, LST in Kelvin, and Celsius
Export.table.toDrive({
  collection: samples,
  description: 'MIE_20241103_MODIS_MYD11A1_LST_1000m',
  fileFormat: 'CSV',
  selectors: ['date', 'longitude', 'latitude', 'LST_Day_1km_K', 'LST_Day_1km_C']
});

// Generate a time series chart of temperature
var tempChart = ui.Chart.feature.byFeature(samples, 'date', 'LST_Day_1km_C')
  .setOptions({
    title: 'MODIS 1000m MYD11A1 Temperature (Celsius) Time Series',
    vAxis: {title: 'Temperature (Celsius)'},
    hAxis: {title: 'Date'},
    lineWidth: 1,
    pointSize: 2
  });
  
print(tempChart);
