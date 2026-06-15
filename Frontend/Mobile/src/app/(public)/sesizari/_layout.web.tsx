import { Stack } from "expo-router";

/**
 * Layout-ul de sesizari pe web.
 *
 * Spre deosebire de _layout.tsx (mobil) — care randeaza header-ul cu titlu,
 * filtre si butonul de adaugare direct in bara nativa de navigare — pe web
 * fiecare ecran isi deseneaza singur header-ul in interiorul unui WebContainer
 * (coloana centrata). De aceea aici ascundem complet header-ul nativ, ca sa nu
 * apara dublat.
 */
export default function SesizariWebLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "none",
      }}
    />
  );
}
