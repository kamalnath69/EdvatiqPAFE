import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { removeToast } from '../../store/toastSlice';

export default function ToastViewport() {
  const dispatch = useAppDispatch();
  const toasts = useAppSelector((state) => state.toast.toasts);

  return (
    <div className="toast-container" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type || 'info'}`}>
          <div className="toast-body">
            <p>{toast.message}</p>
          </div>
          <button
            type="button"
            className="toast-close"
            onClick={() => dispatch(removeToast(toast.id))}
            aria-label="Close notification"
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}
