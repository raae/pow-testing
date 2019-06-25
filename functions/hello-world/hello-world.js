const axios = require("axios")
const Octokit = require("@octokit/rest")
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
})

const PARAMS = {
  owner: "raae",
  repo: "octokit-notes",
  committer: {
    name: "pow",
    email: "pow@raae.codes",
  },
}

const post = async ({ body }) => {
  let { date, entry } = JSON.parse(body)
  entry = JSON.stringify(entry, null, 2)
  const params = {
    ...PARAMS,
    path: date,
    message: "New note",
    content: Buffer.from(entry).toString("base64"),
  }

  try {
    const existingFile = await octokit.repos.getContents(params)
    params.message = "Updated note"
    params.sha = existingFile.data.sha
  } catch (error) {
    // No existing file
  }

  try {
    await octokit.repos.createOrUpdateFile(params)
    return {
      statusCode: 200,
      body: `${params.repo}/${params.path} added/updated`,
    }
  } catch (error) {
    return { statusCode: 500, body: error.toString() }
  }
}

const get = async () => {
  try {
    const params = {
      ...PARAMS,
      path: "/",
    }
    const response = await octokit.repos.getContents(params)
    const notePromises = response.data.map(async file => {
      const { data } = await axios.get(file.download_url)
      return {
        date: file.name,
        entry: data,
      }
    })

    return {
      statusCode: 200,
      body: JSON.stringify(await Promise.all(notePromises), null, 2),
    }
  } catch (error) {
    return { statusCode: 500, body: error.toString() }
  }
}

exports.handler = async event => {
  switch (event.httpMethod) {
    case "POST":
      return post(event)
    case "GET":
      return get(event)
    default:
      break
  }
}
