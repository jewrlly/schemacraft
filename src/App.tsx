import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { NotFound } from './components/NotFound'
import { EditorPage } from './pages/EditorPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { SqlPage } from './pages/SqlPage'
import { TableEditorPage } from './pages/TableEditorPage'
import { ValidationPage } from './pages/ValidationPage'

/**
 * Дерево навігації (глибина 3):
 *   1. /                                   — список схем
 *   2. /project/:projectId                 — редактор схеми
 *   3. /project/:projectId/table/:tableId  — редагування таблиці
 *      /project/:projectId/sql             — згенерований SQL
 *      /project/:projectId/validation      — звіт перевірки
 */
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<ProjectsPage />} />
          <Route path="project/:projectId" element={<EditorPage />} />
          <Route path="project/:projectId/table/:tableId" element={<TableEditorPage />} />
          <Route path="project/:projectId/sql" element={<SqlPage />} />
          <Route path="project/:projectId/validation" element={<ValidationPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}