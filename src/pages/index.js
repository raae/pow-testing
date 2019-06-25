import React, { useRef } from "react"
import axios from "axios"

export default () => {
  const dateEl = useRef(null)
  const entryEl = useRef(null)
  const formEl = useRef(null)

  const onSubmit = event => {
    event.preventDefault(event)
    const data = {
      date: dateEl.current.value,
      entry: entryEl.current.value,
    }

    axios.post("/.netlify/functions/hello-world", data)

    formEl.current.reset()
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
        <input ref={entryEl} type="text" name="entry" />
        <br />
        <button type="submit">Submit</button>
      </form>
    </div>
  )
}
