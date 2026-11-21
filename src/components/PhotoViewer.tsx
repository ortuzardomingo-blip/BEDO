import { useEffect, useMemo, useState } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import Download from 'yet-another-react-lightbox/plugins/download'
import Slideshow from 'yet-another-react-lightbox/plugins/slideshow'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/captions.css'
import { Pencil } from 'lucide-react'
import type { Photo } from '../lib/types'
import { useStore } from '../store'
import { formatDay, photoDate } from '../lib/utils'

export function PhotoViewer({
  photos,
  index,
  onClose,
  onEdit,
  autoplay,
}: {
  photos: Photo[]
  index: number
  onClose: () => void
  onEdit?: (p: Photo) => void
  /** Inicia como presentación automática */
  autoplay?: boolean
}) {
  const { activities } = useStore()
  const [cur, setCur] = useState(index)
  useEffect(() => setCur(index), [index])

  const slides = useMemo(
    () =>
      photos.map((p) => {
        const act = activities.find((a) => a.id === p.activityId)
        return {
          src: p.src,
          width: p.width,
          height: p.height,
          title: p.caption || undefined,
          description: [formatDay(photoDate(p)), act?.title].filter(Boolean).join(' · '),
          download: { url: p.src, filename: `bedo-${p.id.slice(0, 8)}.jpg` },
        }
      }),
    [photos, activities],
  )

  return (
    <Lightbox
      open={index >= 0}
      index={Math.max(index, 0)}
      close={onClose}
      slides={slides}
      plugins={[Zoom, Captions, Download, Slideshow]}
      slideshow={{ autoplay: !!autoplay, delay: 2800 }}
      on={{ view: ({ index: i }) => setCur(i) }}
      carousel={{ finite: photos.length < 3 }}
      captions={{ descriptionTextAlign: 'center' }}
      controller={{ closeOnBackdropClick: true, closeOnPullDown: true }}
      toolbar={{
        buttons: [
          onEdit ? (
            <button
              key="edit"
              type="button"
              className="yarl__button"
              aria-label="Editar"
              onClick={() => photos[cur] && onEdit(photos[cur])}
            >
              <Pencil size={22} strokeWidth={1.75} />
            </button>
          ) : null,
          'slideshow',
          'download',
          'close',
        ].filter(Boolean),
      }}
    />
  )
}
