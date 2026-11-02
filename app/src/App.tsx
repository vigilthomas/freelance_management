import { RouterProvider } from '@tanstack/react-router';
import { MotionConfig } from 'framer-motion';
import { AuthProvider } from './auth/AuthProvider';
import { router } from './router';
import { ThemeProvider } from './ui/theme';
import { ToastProvider } from './ui/Toast';

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </MotionConfig>
  );
}
