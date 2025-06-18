// netlify/functions/hello.js
const admin = require('firebase-admin');

// Initialize Firebase Admin (use environment variables for security)
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

// Call OpenAI API to get AI response based on a prompt

const prompt = "In a single sentence, explain a web browser's CORS policy.";

async function callOpenAI(prompt) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, // Ensure you set this environment variable
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      input: `${prompt}`,
    }),
  });
  if (!response.ok) throw new Error('OpenAI API error');
  const data = await response.json();
  return data;
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': 'https://weselyd.github.io', // or your specific origin
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  // Verify Firebase ID token
  const idToken = event.headers.authorization?.split('Bearer ')[1];
  if (!idToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'No token provided' }),
    };
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
      },
      body: JSON.stringify({
        message: callOpenAI(prompt),
        userId: decodedToken.uid,

      }),
    };
  } catch (error) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid token' }),
    };
  }
};