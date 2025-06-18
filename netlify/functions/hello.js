exports.handler = async event => {
    const subject = event.queryStringParameters.name || 'World'
    return {
        statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "https://weselyd.github.io", // Or specify your domain instead of '*'
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            },
        body: JSON.stringify({ message: "Hello World!" }),
    }
}