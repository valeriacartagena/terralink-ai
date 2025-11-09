import ee
import random

class GEEQueryAgent:
    """Agent 3: GEE Data Fetcher"""
    
    def __init__(self):
        self.gee_available = False
        
        # Try to initialize GEE
        try:
            ee.Initialize()
            self.gee_available = True
            print("✅ Google Earth Engine initialized successfully")
        except Exception as e:
            print(f"⚠️  GEE not authenticated: {e}")
            print("   Using mock data mode (perfect for hackathon demo!)")
            print("   To enable real GEE: run 'earthengine authenticate'")
        
        # Region bounding boxes
        self.region_bounds = {
            'texas': ee.Geometry.Rectangle([-107, 25.8, -93.5, 36.5]) if self.gee_available else {'center': (31.5, -99.5), 'size': 5},
            'california': ee.Geometry.Rectangle([-125, 32, -114, 42]) if self.gee_available else {'center': (37, -120), 'size': 5},
            'nevada': ee.Geometry.Rectangle([-120, 35, -114, 42]) if self.gee_available else {'center': (38.5, -116.5), 'size': 5},
            'arizona': ee.Geometry.Rectangle([-115, 31, -109, 37]) if self.gee_available else {'center': (33.5, -111.5), 'size': 5},
            'new mexico': ee.Geometry.Rectangle([-109, 31, -103, 37]) if self.gee_available else {'center': (34.5, -106), 'size': 5},
            'colorado': ee.Geometry.Rectangle([-109, 37, -102, 41]) if self.gee_available else {'center': (39, -105.5), 'size': 4},
            'utah': ee.Geometry.Rectangle([-114, 37, -109, 42]) if self.gee_available else {'center': (39.5, -111.5), 'size': 4}
        }
    
    def get_region_geometry(self, region_name):
        """Convert region name to GEE geometry"""
        # Handle None or invalid region
        if not region_name:
            region_name = 'texas'
        
        region_key = region_name.lower().strip()
        
        if self.gee_available:
            return self.region_bounds.get(region_key, self.region_bounds['texas'])
        else:
            return self.region_bounds.get(region_key, self.region_bounds['texas'])
    
    def query_solar_sites(self, region_name, datasets, num_samples=100):
        """Query GEE for solar sites with scoring algorithm"""
        
        # Handle None region - default to Texas
        if not region_name:
            print("   ⚠️  No region specified, defaulting to Texas")
            region_name = 'Texas'
        
        print(f"\n🛰️  Agent 3: Querying for {num_samples} sites in {region_name}...")
        
        if not self.gee_available:
            print("   📊 Using mock data mode")
            return self._generate_mock_sites(region_name, num_samples)
        
        try:
            region = self.get_region_geometry(region_name)
            
            # Get solar irradiance data
            print("   Fetching solar irradiance...")
            irradiance = ee.ImageCollection('ECMWF/ERA5_LAND') \
                .select('surface_solar_radiation_downwards') \
                .filterBounds(region) \
                .filterDate('2023-01-01', '2023-12-31') \
                .mean()
            
            # Convert to kWh/m²/day (from J/m²)
            irradiance = irradiance.divide(3600000).multiply(24)
            
            # Get elevation and calculate slope
            print("   Calculating terrain slope...")
            elevation = ee.Image('USGS/SRTMGL1_003')
            slope = ee.Terrain.slope(elevation)
            
            # Composite scoring algorithm
            score = irradiance.multiply(5).add(slope.multiply(-1).add(45))
            score = score.clamp(0, 100)
            
            # Sample points across the region
            print(f"   Sampling {num_samples} locations...")
            samples = score.sample(
                region=region,
                scale=5000,
                numPixels=num_samples,
                seed=42,
                geometries=True
            )
            
            # Get results
            features = samples.getInfo()['features']
            
            sites = []
            for i, feature in enumerate(features):
                coords = feature['geometry']['coordinates']
                props = feature['properties']
                
                raw_score = props.get('constant', 50)
                
                sites.append({
                    'id': i + 1,
                    'lat': round(coords[1], 4),
                    'lon': round(coords[0], 4),
                    'location': f"{coords[1]:.4f}, {coords[0]:.4f}",
                    'score': int(min(100, max(0, raw_score))),
                    'irradiance': round(props.get('surface_solar_radiation_downwards', 6.0) / 3600000 * 24, 2),
                    'slope': round(props.get('slope', 2.0), 2),
                    'metrics': {
                        'irradiance': round(props.get('surface_solar_radiation_downwards', 6.0) / 3600000 * 24, 2),
                        'slope': round(props.get('slope', 2.0), 2),
                        'elevation': round(props.get('elevation', 500), 1)
                    }
                })
            
            sites.sort(key=lambda x: x['score'], reverse=True)
            
            print(f"   ✅ Analyzed {len(sites)} sites")
            if sites:
                print(f"   🏆 Top site: Score {sites[0]['score']}/100 at {sites[0]['location']}")
            
            return sites
            
        except Exception as e:
            print(f"   ❌ GEE Error: {str(e)}")
            print(f"   📊 Falling back to mock data")
            return self._generate_mock_sites(region_name, num_samples)
    
    def _generate_mock_sites(self, region_name, num_samples):
        """Generate realistic mock data when GEE is unavailable"""
        
        # Handle None or invalid region
        if not region_name:
            region_name = 'Texas'
        
        # Regional centers and characteristics
        region_data = {
            'texas': {'center': (31.5, -99.5), 'irr_base': 6.2, 'slope_avg': 2.0},
            'california': {'center': (37, -120), 'irr_base': 6.8, 'slope_avg': 4.0},
            'nevada': {'center': (38.5, -116.5), 'irr_base': 7.0, 'slope_avg': 3.0},
            'arizona': {'center': (33.5, -111.5), 'irr_base': 7.2, 'slope_avg': 2.5},
            'new mexico': {'center': (34.5, -106), 'irr_base': 6.9, 'slope_avg': 2.2},
            'colorado': {'center': (39, -105.5), 'irr_base': 5.8, 'slope_avg': 5.0},
            'utah': {'center': (39.5, -111.5), 'irr_base': 6.5, 'slope_avg': 4.5}
        }
        
        region_key = region_name.lower().strip()
        region_info = region_data.get(region_key, region_data['texas'])
        
        center = region_info['center']
        base_irradiance = region_info['irr_base']
        avg_slope = region_info['slope_avg']
        
        sites = []
        for i in range(num_samples):
            # Random location within ~5 degree box around center
            lat = center[0] + (random.random() - 0.5) * 5
            lon = center[1] + (random.random() - 0.5) * 5
            
            # Generate realistic metrics
            irradiance = base_irradiance + random.gauss(0, 0.8)
            irradiance = max(4.5, min(8.0, irradiance))
            
            slope = abs(random.gauss(avg_slope, 2.5))
            slope = min(15, slope)
            
            # Calculate composite score
            score = (irradiance * 5) + (45 - slope)
            score = max(0, min(100, score))
            score += random.gauss(0, 5)
            score = int(max(50, min(100, score)))
            
            elevation = random.uniform(100, 2000)
            
            sites.append({
                'id': i + 1,
                'lat': round(lat, 4),
                'lon': round(lon, 4),
                'location': f"{lat:.4f}, {lon:.4f}",
                'score': score,
                'irradiance': round(irradiance, 2),
                'slope': round(slope, 2),
                'metrics': {
                    'irradiance': round(irradiance, 2),
                    'slope': round(slope, 2),
                    'elevation': round(elevation, 1),
                    'land_cover': random.choice(['grassland', 'shrubland', 'cropland', 'barren']),
                    'protected_distance': round(random.uniform(5, 50), 1)
                }
            })
        
        sites.sort(key=lambda x: x['score'], reverse=True)
        
        print(f"   ✅ Generated {len(sites)} mock sites for {region_name}")
        if sites:
            print(f"   🏆 Top site: Score {sites[0]['score']}/100 ({sites[0]['irradiance']} kWh/m²/day, {sites[0]['slope']}° slope)")
        
        return sites