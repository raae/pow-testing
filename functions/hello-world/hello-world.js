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

const BASE_PATH = "test"

const post = async ({ body }) => {
  let { date, entry } = JSON.parse(body)
  entry = JSON.stringify(entry, null, 2)

  const params = {
    ...PARAMS,
    path: `${BASE_PATH}/${date}`,
    message: "New note",
    content: Buffer.from(entry, "utf8").toString("base64"),
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
    console.warn(error)
    return { statusCode: 500, body: error.toString() }
  }
}

const get = async () => {
  try {
    const params = {
      ...PARAMS,
      path: `${BASE_PATH}/`,
    }
    const response = await octokit.repos.getContents(params)
    const notePromises = response.data.map(async file => {
      const { data } = await axios.get(file.download_url, {
        responseEncoding: "base64",
      })

      return {
        date: file.name,
        entry: data,
      }
    })

    const notes = await Promise.all(notePromises)
    const notesString = JSON.stringify(notes, null, 2)

    return {
      statusCode: 200,
      body: notesString,
    }
  } catch (error) {
    console.warn(error)
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
