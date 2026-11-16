import { Link } from 'react-router-dom'

export function NotFound({ what = 'Сторінку' }: { what?: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      <h2 className="text-lg font-semibold text-slate-900">{what} не знайдено</h2>
      <p className="mt-1 text-sm text-slate-600">Можливо, її було видалено або посилання неправильне.</p>
      <Link to="/" className="mt-6 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
        До списку схем
      </Link>
    </div>
  )
}