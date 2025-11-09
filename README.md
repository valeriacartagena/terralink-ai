# TerraLink

**TerraLink** is an AI-powered renewable energy site analysis platform that helps identify optimal locations for solar, wind, hydro, and geothermal energy projects. Built with Google Gemini AI and Google Earth Engine, it provides intelligent site analysis, scoring, and predictive insights.

![Powered by Google Gemini & Google Earth Engine](https://img.shields.io/badge/Powered%20by-Google%20Gemini%20%26%20Google%20Earth%20Engine-blue)

##  Features

-  **AI-Powered Chat Interface** - Natural language queries for site analysis
-  **Interactive Map Visualization** - View potential sites on an interactive map
-  **Multi-Agent AI System** - 5 specialized AI agents working together:
  - **Agent 1**: Query Parser (Gemini) - Understands user intent
  - **Agent 2**: Dataset Discovery - Finds relevant GEE datasets
  - **Agent 3**: GEE Data Fetcher - Queries Google Earth Engine
  - **Agent 4**: Results Explainer (Gemini) - Provides natural language insights
  - **Agent 5**: Predictive Intelligence (Gemini) - Forecasts future trends
-  **Site Scoring Algorithm** - Composite scoring based on multiple factors
-  **Predictive Analytics** - AI-generated forecasts for 2025 and 2030
-  **Customizable Parameters** - Adjust weights and criteria for optimization
-  **Google Earth Engine Integration** - Real-time geospatial data analysis
-  **Multiple Energy Types** - Support for solar, wind, hydro, and geothermal

##  Architecture

### Frontend (React)
- **React 19** with functional components and hooks
- **Tailwind CSS** for styling
- **Leaflet** and **React-Leaflet** for map visualization
- **Lucide React** for icons
- Modern, responsive UI with dark theme

### Backend (Flask)
- **Flask** REST API
- **Google Gemini Pro** for AI-powered analysis
- **Google Earth Engine API** for geospatial data
- **Multi-agent system** for intelligent processing
- CORS-enabled for frontend communication

##  Quick Start

### Prerequisites

- **Node.js** (v14 or higher)
- **Python** (v3.8 or higher)
- **Google Gemini API Key** - Get one from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Google Earth Engine Account** (optional, for real data) - Sign up at [earthengine.google.com](https://earthengine.google.com)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd renewable-site-app
   ```

2. **Set up the backend**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   ```bash
   # Create .env file in backend directory
   cd backend
   echo "GEMINI_API_KEY=your_gemini_api_key_here" > .env
   ```

4. **Set up Google Earth Engine (Optional)**
   ```bash
   # Authenticate with Google Earth Engine
   earthengine authenticate
   ```
   > **Note**: If GEE is not authenticated, the app will run in mock mode with simulated data.

5. **Set up the frontend**
   ```bash
   # From project root
   npm install
   ```

### Running the Application

1. **Start the backend server**
   ```bash
   cd backend
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   python app.py
   ```
   The backend will run on `http://localhost:5001`

2. **Start the frontend development server**
   ```bash
   # From project root
   npm start
   ```
   The frontend will open at `http://localhost:3000`

3. **Access the application**
   - Open your browser to `http://localhost:3000`
   - Start chatting with the AI agent!

##  Environment Variables

### Backend (.env file)
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### Frontend Configuration
Update the API URL in `src/RenewableSiteApp.jsx` if needed:
```javascript
const API_URL = 'http://localhost:5001/api';
```

For production, update this to your backend URL.

##  Supported Regions

Currently supported regions for analysis:
- Texas
- California
- Nevada
- Arizona
- New Mexico
- Colorado
- Utah

> More regions can be added by updating the region bounds in `backend/gee_queries.py`

##  API Endpoints

### `GET /api/health`
Health check endpoint
```json
{
  "status": "healthy",
  "ai_model": "Google Gemini Pro",
  "gee_status": "connected" | "mock_mode"
}
```

### `POST /api/chat`
Process user query and parse intent
```json
{
  "message": "Find solar sites in California"
}
```

### `POST /api/analyze`
Analyze sites and generate results
```json
{
  "query": "Find solar sites in California"
}
```

Returns:
- Site locations with coordinates
- Scoring metrics
- AI-generated explanations
- Predictive forecasts
- Dataset information

### `POST /api/predict`
Get predictive analytics for a region
```json
{
  "energy_type": "solar",
  "region": "California"
}
```

##  Usage Examples

### Example Queries

- `"Find solar farm sites in California"`
- `"Wind energy sites in Texas"`
- `"30 acre solar farm in Nevada"`
- `"Hydroelectric sites in Colorado"`
- `"Geothermal sites in Arizona"`

### Features in Action

1. **Chat with the AI**: Type your query in natural language
2. **View Results**: See sites displayed on an interactive map
3. **Analyze Metrics**: Check scores, irradiance, slope, and other factors
4. **Read Insights**: Get AI-generated explanations for site suitability
5. **View Predictions**: See forecasts for 2025 and 2030
6. **Customize Parameters**: Adjust weights for different criteria

##  Technology Stack

### Frontend
- **React** 19.2.0
- **Tailwind CSS** 3.4.18
- **Leaflet** 1.9.4 & React-Leaflet 5.0.0
- **Lucide React** 0.553.0

### Backend
- **Flask** 3.0.0
- **Flask-CORS** 4.0.0
- **Google Generative AI** 0.3.1
- **Earth Engine API** 0.1.384
- **Python-dotenv** 1.0.0



##  Site Scoring Algorithm

Sites are scored based on multiple factors:
- **Solar Irradiance** (weight: 40%) - Energy potential
- **Terrain Slope** (weight: 30%) - Construction feasibility
- **Land Cover** (weight: 20%) - Environmental impact
- **Protected Areas** (weight: 10%) - Regulatory considerations


## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Built with ❤️ for renewable energy innovation**
