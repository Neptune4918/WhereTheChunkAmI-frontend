import { ReactPhotoSphereViewer } from 'react-photo-sphere-viewer'

interface Props {
  url: string
}

export default function PanoramaViewer({ url }: Props) {
  return (
    <ReactPhotoSphereViewer
      src={url}
      height="100%"
      width="100%"
      defaultZoomLvl={0}
    />
  )
}
