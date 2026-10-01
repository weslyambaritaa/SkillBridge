import { logoutAction } from "@/features/auth/actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button className="button button-subtle" type="submit">
        Keluar
      </button>
    </form>
  );
}
