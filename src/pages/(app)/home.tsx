/** /home → the athlete's day. Kept as a route because the nav and tests link here. */
import { Navigate } from 'react-router-dom'

export default function HomePage() {
  return <Navigate to="/today" replace />
}
