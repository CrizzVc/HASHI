import { useEffect, useState } from 'react'

function Versions(): React.JSX.Element {
  const [version, setVersion] = useState('')
  const [platform, setPlatform] = useState('')

  useEffect(() => {
    window.api
      .getAppVersion()
      .then(setVersion)
      .catch(() => {})
    window.api
      .getSystemInfo()
      .then((info) => setPlatform(`${info.platform} (${info.arch})`))
      .catch(() => {})
  }, [])

  return (
    <ul className="versions">
      <li className="electron-version">HASHI v{version}</li>
      <li className="chrome-version">{platform}</li>
    </ul>
  )
}

export default Versions
