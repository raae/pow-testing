import React, { useRef, useState, useEffect } from "react"
import localforage from "localforage"
import axios from "axios"

const ALGORITHM = "AES-GCM"
const KEY_LENGTH = 256

const encode = text => {
  return new TextEncoder().encode(text)
}

const decode = buffer => {
  return new TextDecoder("utf-8").decode(buffer)
}

const serialize = buffer => {
  return new Uint8Array(buffer).toString()
}

const deserialize = string => {
  return new Uint8Array(string.split(","))
}

const generateKey = async () => {
  console.log("Generate key")
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
  return window.crypto.getRandomValues(new Uint8Array(12))
}

const encrypt = async (text, key, iv) => {
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv },
    key,
    encode(text)
  )

  return encryptedBuffer
}

const decrypt = async (cypherBuffer, key, iv) => {
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: ALGORITHM, iv: iv },
    key,
    cypherBuffer
  )

  return decode(decryptedBuffer)
}

const fetchNotes = async key => {
  const response = await axios.get("/.netlify/functions/hello-world")
  const notePromises = response.data.map(async note => {
    note.entry = await decrypt(
      deserialize(note.entry.cypher),
      key,
      deserialize(note.entry.iv)
    )
    return note
  })
  return await Promise.all(notePromises)
}

const saveNote = async ({ date, entry }, key) => {
  const iv = generateNonce()

  const note = {
    date: date,
    entry: {
      cypher: serialize(await encrypt(entry, key, iv)),
      iv: serialize(iv),
    },
  }

  return await axios.post("/.netlify/functions/hello-world", note)
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

    try {
      setSaving(true)
      await saveNote(note, key)
      await setNotes(await fetchNotes(key))
      setSaving(false)
      formEl.current.reset()
    } catch (error) {
      setSaving(false)
      console.error(error)
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
