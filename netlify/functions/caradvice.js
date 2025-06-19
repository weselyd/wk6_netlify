// Initialize Firebase Admin (use environment variables for security)
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

// Call OpenAI API to get AI response based on a prompt
async function callOpenAI(prompt) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, // Ensure you set this environment variable
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      input: `${prompt}`,  // Use the prompt from the user request
    }),
  });
  if (!response.ok) throw new Error('OpenAI API error');
  const data = await response.json();
  return data;
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {  // Handle preflight requests for CORS
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': 'https://weselyd.github.io',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {  // Handle only POST requests
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': 'https://weselyd.github.io',
      },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  // Process user's POST request
  const idToken = event.headers.authorization?.split('Bearer ')[1];  // Extract the token from the Authorization header
  if (!idToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'No token provided' }),
    };
  }
  try { // Verify the ID token using Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    let aiResponseToUser = "No advice received.";

    let userQuery = '';
    try {  // Parse the request body to get the user's input
      const body = JSON.parse(event.body);
      userQuery = String(body.input) || '';
    } catch (err) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON' }),
      };
    }
    try {  // Call OpenAI API with the user's query
      const aiReponse = await callOpenAI(userQuery);  // Call OpenAI API with the prompt
      aiResponseToUser = aiReponse.output?.[0]?.content?.[0]?.text?.trim() || "No advice received.";
    } catch (error) {  // Handle any errors from the OpenAI API call, log to console, and display a user-friendly message
      console.error('Error fetching AI advice:', error);
      // Optionally set aiResponseToUser to a user-friendly error message
      aiResponseToUser = "Could not get advice from OpenAI";
    }
    return {  // Return the AI response to the user
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
      },
      body: JSON.stringify({
        message: aiResponseToUser || 'No response from OpenAI',
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