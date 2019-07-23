import React, { useRef, useState, useEffect } from "react"
import localforage from "localforage"
import axios from "axios"

const ALGORITHM = "AES-GCM"
const KEY_LENGTH = 256

const encodeText = text => {
  return new TextEncoder().encode(text)
}

const decodeText = buffer => {
  return new TextDecoder().decode(buffer)
}

const serializeBuffer = buffer => {
  return String.fromCharCode(...new Int8Array(buffer))
}

const deserializeBuffer = bufferString => {
  const chars = Array.from(bufferString).map(ch => ch.charCodeAt())
  return Int8Array.from(chars).buffer
}

const generateKey = async () => {
  return await window.crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ["encrypt", "decrypt"]
  )
}

const initKey = async () => {
  try {
    let key = await localforage.getItem("cryptokey")
    if (!key) {
      key = await generateKey()
    }
    return await localforage.setItem("cryptokey", key)
  } catch (error) {
    console.error(error)
  }
}

const generateNonce = () => {
  const nonce = window.crypto.getRandomValues(new Int8Array(12))
  return serializeBuffer(nonce)
}

const encrypt = async (text, key, iv) => {
  const cypherBuffer = await window.crypto.subtle.encrypt(
    { name: ALGORITHM, iv: deserializeBuffer(iv) },
    key,
    encodeText(text)
  )

  return serializeBuffer(cypherBuffer)
}

const decrypt = async (cypher, key, iv) => {
  try {
    const textBuffer = await window.crypto.subtle.decrypt(
      { name: ALGORITHM, iv: deserializeBuffer(iv) },
      key,
      deserializeBuffer(cypher)
    )

    return decodeText(textBuffer)
  } catch (error) {
    return "Bad encryption"
  }
}

const fetchNotes = async key => {
  try {
    const response = await axios.get("/.netlify/functions/notes")
    const notePromises = response.data.map(async note => {
      note.entry = await decrypt(note.entry.cypher, key, note.entry.iv)
      return note
    })
    return await Promise.all(notePromises)
  } catch (error) {
    console.warn("Fetch Notes", error)
    return []
  }
}

const saveNote = async ({ date, entry }, key) => {
  try {
    const iv = generateNonce()

    const note = {
      date: date,
      entry: {
        cypher: await encrypt(entry, key, iv),
        iv: iv,
      },
    }

    await axios.post("/.netlify/functions/notes", note)
    return note
  } catch (error) {
    console.warn("Save Note", error)
    return false
  }
}

const IndexPage = () => {
  const [key, setKey] = useState()
  const [notes, setNotes] = useState([])
  const [saving, setSaving] = useState(false)
  const dateEl = useRef(null)
  const entryEl = useRef(null)
  const formEl = useRef(null)

  useEffect(() => {
    const initData = async () => {
      const key = await initKey()
      setKey(key)
      setNotes(await fetchNotes(key))
    }

    initData()
  }, [])

  const onSubmit = async event => {
    event.preventDefault(event)

    const note = {
      date: dateEl.current.value,
      entry: entryEl.current.value,
    }

    setSaving(true)
    const saved = await saveNote(note, key)
    await setNotes(await fetchNotes(key))
    setSaving(false)
    if (saved) {
      formEl.current.reset()
    }
  }

  return (
    <div>
      <form ref={formEl} onSubmit={onSubmit}>
        Date:
        <br />
        <input ref={dateEl} type="date" name="date" />
        <br />
        Notes:
        <br />
        <textarea ref={entryEl} type="text" name="entry" />
        <br />
        <button disabled={!key || saving} type="submit">
          Submit
        </button>
      </form>
      <div>
        {notes.map(({ date, entry }) => {
          return (
            <div key={date}>
              <h1>{date}</h1>
              <p>{entry}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default IndexPage
