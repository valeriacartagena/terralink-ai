import google.generativeai as genai
import os
import json
import re
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
        
    def _extract_json_from_text(self, text):
        """Extract JSON from text that might contain markdown or extra text"""
        
        # First, try removing markdown code blocks
        text_clean = re.sub(r'```json\s*', '', text, flags=re.IGNORECASE)
        text_clean = re.sub(r'```\s*', '', text_clean)
        text_clean = text_clean.strip()
        
        # Try parsing the cleaned text directly
        try:
            return json.loads(text_clean)
        except:
            pass
        
        # Try to find JSON object boundaries more carefully
        # Find the first { and match it with the last }
        start = text_clean.find('{')
        if start >= 0:
            # Find matching closing brace by counting braces
            brace_count = 0
            end = start
            for i in range(start, len(text_clean)):
                if text_clean[i] == '{':
                    brace_count += 1
                elif text_clean[i] == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end = i + 1
                        break
            
            if end > start:
                try:
                    json_str = text_clean[start:end]
                    return json.loads(json_str)
                except:
                    pass
        
        # Last resort: try to find any JSON-like structure
        # Look for patterns like {"key": "value"}
        json_pattern = r'\{[^{}]*"[^"]*"[^{}]*\}'
        matches = re.findall(json_pattern, text_clean, re.DOTALL)
        for match in matches:
            try:
                return json.loads(match)
            except:
                continue
        
        return None
    
    def _extract_info_from_text(self, text, user_input):
        """Fallback: Try to extract energy_type and region from text using simple patterns"""
        
        result = {
            "energy_type": "solar",
            "region": None,
            "size_acres": None,
            "criteria": {"primary": ["irradiance", "slope"], "secondary": []}
        }
        
        # Try to find energy type
        energy_patterns = {
            'solar': r'solar|pv|photovoltaic',
            'wind': r'wind|turbine',
            'hydro': r'hydro|hydropower|water',
            'geothermal': r'geothermal|geo-thermal'
        }
        
        text_lower = text.lower() + " " + user_input.lower()
        for energy_type, pattern in energy_patterns.items():
            if re.search(pattern, text_lower):
                result['energy_type'] = energy_type
                break
        
        # Try to find region (US states)
        states = ['texas', 'california', 'nevada', 'arizona', 'new mexico', 'colorado', 
                 'utah', 'florida', 'north carolina', 'new york', 'massachusetts',
                 'oregon', 'washington', 'montana', 'wyoming', 'idaho']
        
        for state in states:
            if state in text_lower:
                result['region'] = state.title()
                break
        
        # Try to find size
        size_match = re.search(r'(\d+)\s*acre', text_lower)
        if size_match:
            result['size_acres'] = int(size_match.group(1))
        
        return result

    def agent_1_parse_query(self, user_input):
        """Agent 1: Query Parser - Understands user intent using Gemini"""
        
        prompt = f"""You are a renewable energy site analyst. Parse this user query and extract key information:

User Query: "{user_input}"

Extract and return ONLY valid JSON (no markdown, no code blocks, no explanations):
{{
    "energy_type": "solar|wind|hydro|geothermal",
    "region": "state or region name (e.g., Texas, California, Nevada)",
    "size_acres": number or null,
    "criteria": {{
        "primary": ["list of important factors"],
        "secondary": ["list of secondary factors"]
    }}
}}

IMPORTANT RULES:
1. Output ONLY the JSON object, nothing else
2. If energy type is not specified, infer from context (default to "solar" only if truly ambiguous)
3. If region is not specified, set to null (do NOT default to Texas)
4. Extract the exact region name mentioned by the user
5. Use proper JSON format with double quotes

Examples:
- "solar farm in California" → {{"energy_type": "solar", "region": "California", "size_acres": null, "criteria": {{"primary": ["irradiance", "slope"], "secondary": []}}}}
- "wind energy site in Nevada" → {{"energy_type": "wind", "region": "Nevada", "size_acres": null, "criteria": {{"primary": ["wind_speed", "elevation"], "secondary": []}}}}
- "30 acre solar farm in Arizona" → {{"energy_type": "solar", "region": "Arizona", "size_acres": 30, "criteria": {{"primary": ["irradiance", "slope"], "secondary": ["land_cover"]}}}}"""

        text = None
        try:
            print(f"   📤 Sending to Gemini: '{user_input[:50]}...'")
            response = self.model.generate_content(
                prompt,
                generation_config=self.generation_config
            )
            
            text = response.text.strip()
            print(f"   📥 Raw Gemini response: {text[:200]}...")
            
            # Try multiple methods to extract JSON
            parsed = self._extract_json_from_text(text)
            
            if parsed:
                print(f"   ✓ Successfully parsed JSON from Gemini")
                
                # Validate required fields but don't default to Texas if region is missing
                if 'energy_type' not in parsed or not parsed['energy_type']:
                    parsed['energy_type'] = 'solar'
                    print(f"   ⚠️ Missing energy_type, defaulting to solar")
                
                if 'region' not in parsed or not parsed['region']:
                    # Try to extract from user input as fallback
                    fallback_info = self._extract_info_from_text(user_input, user_input)
                    parsed['region'] = fallback_info['region']
                    if not parsed['region']:
                        print(f"   ⚠️ No region found in query, setting to null")
                        parsed['region'] = None
                    else:
                        print(f"   ✓ Extracted region from user input: {parsed['region']}")
                
                if 'criteria' not in parsed:
                    parsed['criteria'] = {"primary": ["irradiance", "slope"], "secondary": []}
                
                print(f"   ✓ Final parsed: {parsed['energy_type']} in {parsed['region']}")
                return parsed
            else:
                print(f"   ⚠️ Could not parse JSON, trying fallback extraction")
                # Fallback: try to extract info from the response text and user input
                parsed = self._extract_info_from_text(text, user_input)
                
                if not parsed['region']:
                    print(f"   ⚠️ Still no region found, checking user input directly")
                    # Last resort: check user input directly
                    user_lower = user_input.lower()
                    states = ['texas', 'california', 'nevada', 'arizona', 'new mexico', 
                             'colorado', 'utah', 'florida', 'north carolina', 'new york']
                    for state in states:
                        if state in user_lower:
                            parsed['region'] = state.title()
                            print(f"   ✓ Found region in user input: {parsed['region']}")
                            break
                
                print(f"   ✓ Fallback parsed: {parsed['energy_type']} in {parsed['region']}")
                return parsed
            
        except Exception as e:
            print(f"   ❌ Agent 1 error: {e}")
            print(f"   Error type: {type(e).__name__}")
            if text:
                print(f"   Response text: {text[:500]}")
            
            # Last resort: try to extract from user input directly
            print(f"   🔍 Attempting direct extraction from user input")
            parsed = self._extract_info_from_text(user_input, user_input)
            
            if not parsed['region']:
                print(f"   ⚠️ WARNING: No region could be extracted from: '{user_input}'")
                print(f"   Setting region to null (will need user clarification)")
                parsed['region'] = None
            
            return parsed
    
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