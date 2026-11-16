import { useConfirmStore } from '../store/confirmStore'
import { Modal } from './Modal'
import { Button } from './ui'

export function ConfirmHost() {
  const { options, close } = useConfirmStore()
  return (
    <Modal
      open={options !== null}
      title={options?.title ?? ''}
      onClose={() => close(false)}
      footer={
        <>
          <Button onClick={() => close(false)}>Скасувати</Button>
          <Button variant="danger" onClick={() => close(true)} autoFocus>
            {options?.confirmLabel ?? 'Видалити'}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{options?.text}</p>
    </Modal>
  )
}