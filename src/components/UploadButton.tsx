import { useRef, type ReactNode } from 'react'
import { ACCEPT_IMAGES } from '../lib/images'

/** Botón que abre el selector de archivos (en el celular ofrece galería o cámara) */
export function UploadButton({
  onFiles,
  className,
  children,
  multiple = true,
}: {
  onFiles: (files: File[]) => void
  className?: string
  children: ReactNode
  multiple?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <button type="button" className={className} onClick={() => ref.current?.click()}>
        {children}
      </button>
      <input
        ref={ref}
        type="file"
        accept={ACCEPT_IMAGES}
        multiple={multiple}
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ''
          if (files.length) onFiles(files)
        }}
      />
    </>
  )
}
