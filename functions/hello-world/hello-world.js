exports.handler = async (event, context) => {
  console.log(JSON.stringify(event, null, 2))
  console.log(JSON.stringify(context, null, 2))
  try {
    const subject = event.queryStringParameters.name || "World"
    return { statusCode: 200, body: `Hello ${subject}` }
  } catch (err) {
    return { statusCode: 500, body: err.toString() }
  }
}
