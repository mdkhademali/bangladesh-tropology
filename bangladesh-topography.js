// ==============================
// Bangladesh Topography & Realistic Rivers/Water Map
// ==============================

// STUDY AREA
var countries = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017');
var bangladesh = countries.filter(ee.Filter.eq('country_na','Bangladesh')).geometry();
Map.centerObject(bangladesh,7);

// DEM
var dem = ee.ImageCollection('COPERNICUS/DEM/GLO30')
          .select('DEM')
          .filterBounds(bangladesh)
          .mosaic()
          .clip(bangladesh);

// Rivers & Coast (HydroSHEDS)
var rivers = ee.FeatureCollection('WWF/HydroSHEDS/v1/FreeFlowingRivers')
               .filterBounds(bangladesh);
var rivers_raster = ee.Image().byte().paint(rivers, 1).clip(bangladesh);

// Coastal mask for Bay of Bengal
var coast = ee.Image().byte().paint(bangladesh,1)
               .clip(bangladesh)
               .where(dem.lt(2),1); // very low elevation = coast/floodplain

// Water bodies: combine DEM low areas + rivers
var water = rivers_raster.gt(0).or(dem.lt(2));

// Classification thresholds
var classified = dem.expression(
  "(water==1) ? 6" +          // Rivers / Water bodies
  ": (DEM < 5) ? 1" +         // Floodplain
  ": (DEM >=5 && DEM < 10) ? 2" + // Agricultural Plain / Low
  ": (DEM >=10 && DEM < 30) ? 3" + // Upland / Medium
  ": (DEM >=30 && DEM < 60) ? 4" + // Hills
  ": 5",                       // Hilltop / High
  {'DEM': dem, 'water': water}
).rename('Topography');

// Mask to Bangladesh
classified = classified.updateMask(ee.Image().byte().paint(bangladesh,1));

// Visualization
var palette = ['d0f0ff','a0e060','ffff66','ffb366','ff6666','3366ff'];
Map.addLayer(classified, {min:1,max:6,palette:palette}, 'Bangladesh Topography');

// Legend
function addLegend(){
  var legend = ui.Panel({style:{position:'bottom-left',padding:'8px 15px'}});
  legend.add(ui.Label({
    value:'Bangladesh Topography',
    style:{fontWeight:'bold',fontSize:'16px',margin:'0 0 6px 0'}
  }));

  var names = [
    'Floodplain / Lowland',
    'Agricultural Plain',
    'Upland / Medium',
    'Hills',
    'Hilltop / High',
    'Rivers & Water Bodies'
  ];
  
  for (var i=0;i<6;i++){
    var colorBox = ui.Label({
      style:{
        backgroundColor:palette[i],
        padding:'8px',
        margin:'0 6px 4px 0',
        border:'1px solid #000'
      }
    });
    var desc = ui.Label({value:names[i],style:{margin:'0 0 4px 0'}});
    legend.add(ui.Panel({widgets:[colorBox,desc],layout:ui.Panel.Layout.Flow('horizontal')}));
  }

  // Prepared by and source (small, italic)
  legend.add(ui.Label({
    value:'Prepared by: Md. Khadem Ali | \nSource: COPERNICUS DEM & HydroSHEDS',
    style:{fontSize:'10px',fontStyle:'italic',margin:'6px 0 0 0'}
  }));

  Map.add(legend);
}
addLegend();