import { CalendarDays, Images, ImagePlus, Map as MapIcon } from 'lucide-react'
import { useStore } from '../store'
import { UploadButton } from '../components/UploadButton'
import { PageTitle, Segmented } from '../components/Segmented'
import { navigate } from '../lib/route'
import { plural } from '../lib/utils'
import { PhotosView } from './album/PhotosView'
import { MapView } from './album/MapView'
import { DailyView } from './album/DailyView'

type Sub = 'fotos' | 'mapa' | 'diario'

export function Album({ sub }: { sub: string }) {
  const { photos, uploadPhotos } = useStore()
  const view: Sub = sub === 'mapa' || sub === 'diario' ? sub : 'fotos'

  return (
    <section>
      <PageTitle
        title="Álbum"
        subtitle={photos.length ? plural(photos.length, 'recuerdo', 'recuerdos') : 'Todavía no hay fotos'}
      >
        <UploadButton className="btn-primary" onFiles={(f) => uploadPhotos(f)}>
          <ImagePlus size={17} /> Subir fotos
        </UploadButton>
      </PageTitle>

      <Segmented
        className="mt-6"
        layoutId="album-seg"
        value={view}
        onChange={(v) => navigate('album', v === 'fotos' ? '' : v)}
        options={[
          { id: 'fotos', label: 'Fotos', icon: Images },
          { id: 'mapa', label: 'Mapa', icon: MapIcon },
          { id: 'diario', label: 'Una foto al día', icon: CalendarDays },
        ]}
      />

      <div className="mt-6">
        {view === 'fotos' && <PhotosView />}
        {view === 'mapa' && <MapView />}
        {view === 'diario' && <DailyView />}
      </div>
    </section>
  )
}
