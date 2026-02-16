# User Story AI Evaluator

An intelligent tool that uses OpenAI to evaluate user stories on multiple dimensions including clarity, completeness, business value alignment, testability, and technical feasibility.

## Architecture

- **Backend**: Express.js server with OpenAI integration (Node.js)
- **Frontend**: React application with Tailwind CSS
- **API**: REST endpoint for story evaluation

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key (get from https://platform.openai.com/api-keys)

## Setup Instructions

### Backend Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Create `.env` file in the backend directory:
```bash
cp .env.example .env
```

3. Add your OpenAI API key to `.env`:
```
OPENAI_API_KEY=sk_your_key_here
PORT=5000
NODE_ENV=development
```

4. Start the backend server:
```bash
npm start
# Server will run on http://localhost:5000
```

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Create `.env` file in the frontend directory (optional):
```bash
cp .env.example .env
```

3. Start the development server:
```bash
npm start
# Frontend will run on http://localhost:3000
```

## Features

✅ **AI-Powered Analysis**
- Evaluates user stories using GPT-4o
- Provides scores on 5 key parameters (0-20 each)
- Generates actionable recommendations

✅ **User-Friendly Interface**
- Clean, modern UI with Tailwind CSS
- Real-time character counter
- Responsive design (mobile-friendly)
- Color-coded score indicators

✅ **Robust Backend**
- Input validation (10-2000 characters)
- Error handling and logging
- Environment variable configuration
- Health check endpoint

✅ **Production Features**
- CORS support for frontend/backend separation
- Configurable model selection
- Environment-based configuration
- Comprehensive error messages

## API Endpoints

### POST /evaluate
Evaluates a user story

**Request:**
```json
{
  "userStory": "As a user, I want to log in with my credentials so that I can access my account"
}
```

**Response:**
```json
{
  "totalScore": 78,
  "parameters": [
    {
      "name": "Clarity",
      "score": 18,
      "findings": "Clear and concise description..."
    },
    ...
  ],
  "recommendations": [
    "Add acceptance criteria...",
    ...
  ]
}
```

### GET /health
Health check endpoint

**Response:**
```json
{
  "status": "OK",
  "model": "gpt-4o"
}
```

## Environment Variables

### Backend (.env)
- `OPENAI_API_KEY` (required): OpenAI API key
- `PORT` (optional): Server port (default: 5000)
- `MODEL` (optional): OpenAI model to use (default: gpt-4o)
- `NODE_ENV` (optional): Environment (development/production)

### Frontend (.env)
- `REACT_APP_BACKEND_URL` (optional): Backend API URL (default: http://localhost:5000)

## Evaluation Criteria

The evaluator scores user stories on these 5 parameters (0-20 each):

1. **Clarity** - How clear and easy to understand the story is
2. **Completeness** - Whether all necessary information is included
3. **Business Value Alignment** - How well it aligns with business goals
4. **Testability** - How easy it is to write tests for this story
5. **Technical Feasibility** - How realistic it is to implement

## Troubleshooting

### "Failed to connect to backend"
- Ensure backend is running: `cd backend && npm start`
- Check that `REACT_APP_BACKEND_URL` matches your backend URL
- Verify CORS is properly configured

### "OPENAI_API_KEY is not set"
- Ensure `.env` file exists in backend directory
- Verify API key is present and valid
- API key should start with `sk_`

### Connection refused errors
- Check that backend server is running on port 5000
- Verify no other application is using port 5000
- Windows: Run `netstat -ano | findstr :5000`

## Input Validation

- Minimum length: 10 characters
- Maximum length: 2000 characters
- Must be a non-empty string

## Development

### Build frontend for production:
```bash
cd frontend
npm run build
```

### Run backend tests:
```bash
cd backend
npm test # If tests are added
```

## Cost Optimization

The app currently uses `gpt-4o` which is more expensive. To reduce costs, you can:

1. Switch to `gpt-4-turbo`:
```bash
# In .env
MODEL=gpt-4-turbo
```

2. Or use `gpt-3.5-turbo`:
```bash
# In .env
MODEL=gpt-3.5-turbo
```

## Security Considerations

- Never commit `.env` files to version control
- Keep your OpenAI API key private
- Use environment variables for sensitive data
- Validate all user inputs
- Enable rate limiting in production

## Performance

- Average evaluation time: 3-5 seconds
- Supports concurrent evaluations
- Input is limited to 2000 characters to reduce token usage
- Consider implementing caching for repeated queries

## License

MIT

## Support

For issues or questions, check the troubleshooting section or review the error messages in both frontend console and backend logs.
