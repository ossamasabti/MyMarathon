import { useLogin } from '@/api/auth';
import { AuthForm } from '@/components/AuthForm';

export default function LoginScreen() {
  const login = useLogin();
  return (
    <AuthForm
      mode="login"
      pending={login.isPending}
      error={login.error}
      onSubmit={({ email, password }) => login.mutate({ email, password })}
    />
  );
}
