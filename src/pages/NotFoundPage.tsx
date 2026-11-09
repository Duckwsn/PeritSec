import { Link } from 'react-router-dom'
import { ArrowLeft, BookOpen, FolderSearch, SearchX } from 'lucide-react'
import { PageHeader } from '../components/ui'

export function NotFoundPage() {
  return (
    <div className="not-found-page">
      <PageHeader
        title="Este caminho não existe no dossiê."
        lede="O endereço pode ter sido digitado incorretamente, ou o conteúdo ainda não faz parte desta versão do ambiente. Nenhum registro de progresso foi alterado."
      />
      <div className="not-found-panel">
        <div className="not-found-panel__mark" aria-hidden="true">
          <SearchX size={34} />
        </div>
        <div>
          <h2>Rotas disponíveis</h2>
          <p>
            Volte à visão geral para retomar o percurso, abra as trilhas ou vá direto ao caso
            pericial completo.
          </p>
          <div className="button-row">
            <Link className="button button--primary" to="/">
              <ArrowLeft size={15} aria-hidden="true" /> Voltar à visão geral
            </Link>
            <Link className="button button--outline" to="/trilhas">
              <BookOpen size={15} aria-hidden="true" /> Ver trilhas
            </Link>
            <Link className="button button--quiet" to="/casos">
              <FolderSearch size={15} aria-hidden="true" /> Casos de investigação
            </Link>
          </div>
        </div>
      </div>
      <p className="not-found-note mono">
        Se você chegou aqui por um link interno, o endereço deve ser tratado como defeito de
        navegação. O MVP não registra relatórios automáticos de erro.
      </p>
    </div>
  )
}
