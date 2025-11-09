from flask import Flask, request, jsonify
from flask_cors import CORS
from agent_system import MultiAgentSystem
from gee_queries import GEEQueryAgent
import traceback

app = Flask(__name__)
CORS(app)

# Initialize agents
agent_system = MultiAgentSystem()
gee_agent = GEEQueryAgent()

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'ai_model': 'Google Gemini Pro',
        'gee_status': 'connected' if gee_agent.gee_available else 'mock_mode'
    })

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_message = data.get('message', '')
        
        result = agent_system.process_full_query(user_message)
        
        response_text = f"✅ I understand you're looking for {result['parsed_query']['energy_type']} sites in {result['parsed_query']['region']}. Analyzing with Gemini AI..."
        
        return jsonify({
            'response': response_text,
            'parsed': result['parsed_query'],
            'datasets': result['datasets'],
            'ai_model': 'gemini-pro'
        })
    
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze', methods=['POST'])
def analyze():
    try:
        data = request.json
        user_query = data.get('query', '')
        
        # Agent 1 & 2
        result = agent_system.process_full_query(user_query)
        parsed = result['parsed_query']
        datasets = result['datasets']
        
        # Agent 3: GEE Data Fetching
        sites = gee_agent.query_solar_sites(
            region_name=parsed['region'],
            datasets=datasets,
            num_samples=100
        )
        
        # Agent 4: Explanation
        explanation = agent_system.agent_4_explain_results(
            sites=sites[:10],
            energy_type=parsed['energy_type'],
            region=parsed['region']
        )
        
        # Agent 5: Predictive Intelligence (NEW!)
        predictions = agent_system.agent_5_predict_trends(
            sites=sites,
            energy_type=parsed['energy_type'],
            region=parsed['region']
        )
        
        return jsonify({
            'success': True,
            'sites': sites[:20],
            'datasets': datasets,
            'explanation': explanation,
            'predictions': predictions,  # NEW!
            'parsed_query': parsed,
            'total_analyzed': len(sites),
            'ai_model': 'gemini-pro'
        })
    
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/predict', methods=['POST'])
def predict():
    """NEW ENDPOINT: Dedicated predictive intelligence endpoint"""
    try:
        data = request.json
        energy_type = data.get('energy_type', 'solar')
        region = data.get('region', 'Texas')
        
        # Get site data
        sites = gee_agent.query_solar_sites(
            region_name=region,
            datasets=[],
            num_samples=100
        )
        
        # Generate predictions
        predictions = agent_system.agent_5_predict_trends(
            sites=sites,
            energy_type=energy_type,
            region=region
        )
        
        return jsonify({
            'success': True,
            'predictions': predictions,
            'region': region,
            'energy_type': energy_type,
            'ai_model': 'gemini-pro'
        })
    
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("\n🌍 TerraLink Backend Starting...")
    print("🤖 AI Model: Google Gemini Pro")
    print("📡 Agents:")
    print("   - Agent 1: Query Parser (Gemini)")
    print("   - Agent 2: Dataset Discovery")
    print("   - Agent 3: GEE Data Fetcher")
    print("   - Agent 4: Results Explainer (Gemini)")
    print("   - Agent 5: Predictive Intelligence (Gemini) ⭐ NEW!")
    print("\n🚀 Running on http://localhost:5001\n")
    
    app.run(debug=True, port=5001)