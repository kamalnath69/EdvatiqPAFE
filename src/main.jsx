import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux';
import './index.css'
import App from './App.jsx'
import { store } from './store';
import StoreBootstrap from './store/StoreBootstrap';
import ToastViewport from './components/ui/ToastViewport';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <StoreBootstrap>
        <App />
        <ToastViewport />
      </StoreBootstrap>
    </Provider>
  </StrictMode>,
)
