import google.generativeai as genai
import os
import json
from dotenv import load_dotenv

load_dotenv()

class MultiAgentSystem:
    def __init__(self):
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in .env file!")
        
        genai.configure(api_key=api_key)
        
        # Use Gemini Pro model for agents
        self.model = genai.GenerativeModel('gemini-pro')
        
        # Configure generation settings for better JSON outputs
        self.generation_config = {
            'temperature': 0.7,
            'top_p': 0.95,
            'top_k': 40,
            'max_output_tokens': 1024,
        }
        
    def agent_1_parse_query(self, user_input):
        """Agent 1: Query Parser - Understands user intent using Gemini"""
        
        prompt = f"""You are a renewable energy site analyst. Parse this user query:

"{user_input}"

Extract and return ONLY a JSON object with NO other text, no markdown, no code blocks:
{{
    "energy_type": "solar|wind|hydro|geothermal",
    "region": "state or region name",
    "size_acres": number or null,
    "criteria": {{
        "primary": ["list of important factors"],
        "secondary": ["list of secondary factors"]
    }}
}}

CRITICAL: Output ONLY the JSON object. No explanations, no markdown, no ```json blocks.

Example: "30 acre solar farm in Texas" → {{"energy_type": "solar", "region": "Texas", "size_acres": 30, "criteria": {{"primary": ["irradiance", "slope"], "secondary": ["land_cover"]}}}}"""

        try:
            response = self.model.generate_content(
                prompt,
                generation_config=self.generation_config
            )
            
            text = response.text.strip()
            
            # Remove markdown code blocks if present
            text = text.replace('```json', '').replace('```', '').strip()
            
            parsed = json.loads(text)
            
            # Validate and set defaults
            if 'energy_type' not in parsed:
                parsed['energy_type'] = 'solar'
            if 'region' not in parsed:
                parsed['region'] = 'Texas'
            if 'criteria' not in parsed:
                parsed['criteria'] = {"primary": ["irradiance", "slope"], "secondary": []}
                
            print(f"   ✓ Parsed: {parsed['energy_type']} in {parsed['region']}")
            return parsed
            
        except json.JSONDecodeError as e:
            print(f"   ⚠️ JSON parse error: {e}")
            print(f"   Raw response: {text}")
            # Return safe defaults
            return {
                "energy_type": "solar",
                "region": "Texas",
                "size_acres": None,
                "criteria": {"primary": ["irradiance", "slope"], "secondary": []}
            }
        except Exception as e:
            print(f"   ❌ Agent 1 error: {e}")
            return {
                "energy_type": "solar",
                "region": "Texas",
                "size_acres": None,
                "criteria": {"primary": ["irradiance", "slope"], "secondary": []}
            }
    
    def agent_2_discover_datasets(self, energy_type, criteria):
        """Agent 2: Dataset Discovery - Finds relevant GEE datasets"""
        
        dataset_catalog = {
            'solar': [
                {
                    'name': 'Solar Irradiance',
                    'gee_id': 'ECMWF/ERA5_LAND/MONTHLY_AGGR',
                    'parameter': 'surface_solar_radiation_downwards_sum',
                    'relevance': 'primary',
                    'url': 'https://developers.google.com/earth-engine/datasets/catalog/ECMWF_ERA5_LAND_MONTHLY_AGGR',
                    'description': 'Monthly aggregated surface solar radiation from ERA5-Land reanalysis'
                },
                {
                    'name': 'Elevation/Slope',
                    'gee_id': 'USGS/SRTMGL1_003',
                    'parameter': 'elevation',
                    'relevance': 'primary',
                    'url': 'https://developers.google.com/earth-engine/datasets/catalog/USGS_SRTMGL1_003',
                    'description': 'Shuttle Radar Topography Mission elevation data at 30m resolution'
                },
                {
                    'name': 'Land Cover',
                    'gee_id': 'ESA/WorldCover/v200',
                    'parameter': 'Map',
                    'relevance': 'secondary',
                    'url': 'https://developers.google.com/earth-engine/datasets/catalog/ESA_WorldCover_v200',
                    'description': 'Global land cover classification at 10m resolution'
                },
                {
                    'name': 'Protected Areas',
                    'gee_id': 'WCMC/WDPA/current/polygons',
                    'parameter': 'REP_AREA',
                    'relevance': 'secondary',
                    'url': 'https://developers.google.com/earth-engine/datasets/catalog/WCMC_WDPA_current_polygons',
                    'description': 'World Database on Protected Areas'
                }
            ],
            'wind': [
                {
                    'name': 'Wind Speed',
                    'gee_id': 'ECMWF/ERA5/DAILY',
                    'parameter': 'u_component_of_wind_10m',
                    'relevance': 'primary',
                    'url': 'https://developers.google.com/earth-engine/datasets/catalog/ECMWF_ERA5_DAILY',
                    'description': 'Daily wind speed at 10m height'
                },
                {
                    'name': 'Elevation/Slope',
                    'gee_id': 'USGS/SRTMGL1_003',
                    'parameter': 'elevation',
                    'relevance': 'primary',
                    'url': 'https://developers.google.com/earth-engine/datasets/catalog/USGS_SRTMGL1_003',
                    'description': 'Terrain elevation for wind analysis'
                }
            ],
            'hydro': [
                {
                    'name': 'Elevation/Slope',
                    'gee_id': 'USGS/SRTMGL1_003',
                    'parameter': 'elevation',
                    'relevance': 'primary',
                    'url': 'https://developers.google.com/earth-engine/datasets/catalog/USGS_SRTMGL1_003',
                    'description': 'Elevation for hydro potential analysis'
                }
            ],
            'geothermal': [
                {
                    'name': 'Elevation/Slope',
                    'gee_id': 'USGS/SRTMGL1_003',
                    'parameter': 'elevation',
                    'relevance': 'primary',
                    'url': 'https://developers.google.com/earth-engine/datasets/catalog/USGS_SRTMGL1_003',
                    'description': 'Terrain data for geothermal site selection'
                }
            ]
        }
        
        datasets = dataset_catalog.get(energy_type, dataset_catalog['solar'])
        print(f"   ✓ Found {len(datasets)} datasets for {energy_type}")
        return datasets
    
    def agent_4_explain_results(self, sites, energy_type, region):
        """Agent 4: Results Explainer - Natural language insights using Gemini"""
        
        if not sites or len(sites) == 0:
            return "No suitable sites found in the specified region. Try adjusting your criteria or selecting a different region."
        
        top_site = sites[0]
        
        # Prepare site metrics for the prompt
        metrics_summary = {
            'score': top_site.get('score', 0),
            'location': f"{top_site.get('lat', 0):.2f}°N, {abs(top_site.get('lon', 0)):.2f}°W",
            'irradiance': f"{top_site.get('irradiance', 0):.2f} kWh/m²/day" if 'irradiance' in top_site else 'N/A',
            'slope': f"{top_site.get('slope', 0):.2f}°" if 'slope' in top_site else 'N/A'
        }
        
        prompt = f"""You are a renewable energy consultant providing analysis results to a client.

Project Details:
- Energy Type: {energy_type}
- Region: {region}
- Sites Analyzed: {len(sites)}

Top Site Performance:
- Overall Score: {metrics_summary['score']}/100
- Location: {metrics_summary['location']}
- Solar Irradiance: {metrics_summary['irradiance']}
- Terrain Slope: {metrics_summary['slope']}

Write a concise 2-3 sentence explanation that:
1. Highlights why this site scored well
2. Mentions the key favorable metrics
3. Provides one actionable insight or recommendation

Be enthusiastic but professional. Keep it under 100 words."""

        try:
            response = self.model.generate_content(
                prompt,
                generation_config=self.generation_config
            )
            
            explanation = response.text.strip()
            print(f"   ✓ Generated explanation ({len(explanation)} chars)")
            return explanation
            
        except Exception as e:
            print(f"   ⚠️ Agent 4 error: {e}")
            # Fallback explanation
            return f"Analysis complete for {region}. The top site scored {metrics_summary['score']}/100, showing excellent potential for {energy_type} energy production based on favorable terrain and resource availability."
    
    def agent_5_predict_trends(self, sites, energy_type, region):
        """Agent 5: Predictive Intelligence - Forecasts and trend analysis using Gemini"""
        
        if not sites or len(sites) == 0:
            return {
                "forecast": "Insufficient data for prediction",
                "confidence": 0,
                "trends": []
            }
        
        # Calculate statistics from sites
        avg_score = sum(s.get('score', 0) for s in sites) / len(sites)
        top_scores = [s.get('score', 0) for s in sites[:10]]
        avg_irradiance = sum(s.get('irradiance', 0) for s in sites) / len(sites)
        
        prompt = f"""You are an AI forecasting expert specializing in renewable energy trends.

Based on the following site analysis data:
- Energy Type: {energy_type}
- Region: {region}
- Sites Analyzed: {len(sites)}
- Average Suitability Score: {avg_score:.1f}/100
- Top 10 Site Scores: {top_scores}
- Average Solar Irradiance: {avg_irradiance:.2f} kWh/m²/day

Provide predictions in JSON format (NO markdown, NO code blocks):
{{
    "forecast_2025": "brief prediction for 2025",
    "forecast_2030": "brief prediction for 2030",
    "confidence_score": number 0-100,
    "key_trends": ["trend1", "trend2", "trend3"],
    "risk_factors": ["risk1", "risk2"],
    "opportunities": ["opportunity1", "opportunity2"]
}}

Focus on: market growth, technology improvements, policy changes, and environmental factors.
Keep each field concise (under 20 words)."""

        try:
            response = self.model.generate_content(
                prompt,
                generation_config=self.generation_config
            )
            
            text = response.text.strip()
            text = text.replace('```json', '').replace('```', '').strip()
            
            prediction = json.loads(text)
            print(f"   ✓ Generated predictions (confidence: {prediction.get('confidence_score', 0)}%)")
            return prediction
            
        except Exception as e:
            print(f"   ⚠️ Agent 5 error: {e}")
            # Fallback prediction
            return {
                "forecast_2025": f"{energy_type.capitalize()} capacity in {region} projected to grow 15-20%",
                "forecast_2030": f"Market maturity expected with 50%+ increase in installations",
                "confidence_score": 75,
                "key_trends": ["Policy support increasing", "Technology costs declining", "Grid infrastructure improving"],
                "risk_factors": ["Regulatory changes", "Supply chain constraints"],
                "opportunities": ["Federal incentives", "Corporate sustainability goals"]
            }
    
    def process_full_query(self, user_input):
        """Orchestrates all agents in sequence"""
        
        print(f"\n🎯 Processing: '{user_input}'")
        
        # Agent 1: Parse query
        print("🤖 Agent 1: Parsing query (Gemini)...")
        parsed = self.agent_1_parse_query(user_input)
        
        # Agent 2: Discover datasets
        print("🔍 Agent 2: Discovering datasets...")
        datasets = self.agent_2_discover_datasets(
            parsed['energy_type'], 
            parsed.get('criteria', {})
        )
        
        return {
            'parsed_query': parsed,
            'datasets': datasets,
            'ready_for_gee': True
        }