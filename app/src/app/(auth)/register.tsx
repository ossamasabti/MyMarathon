import { useRegister } from '@/api/auth';
import { AuthForm } from '@/components/AuthForm';

export default function RegisterScreen() {
  const register = useRegister();
  return (
    <AuthForm
      mode="register"
      pending={register.isPending}
      error={register.error}
      onSubmit={({ email, password, displayName }) =>
        register.mutate({ email, password, display_name: displayName })
      }
    />
  );
}
