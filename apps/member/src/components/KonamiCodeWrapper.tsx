import KonamiModal from './KonamiModal'
import { useKonamiCode } from '../hooks/useKonamiCode'

export default function KonamiCodeWrapper() {
  const { triggered, reset } = useKonamiCode()
  return <KonamiModal open={triggered} onClose={reset} />
}
