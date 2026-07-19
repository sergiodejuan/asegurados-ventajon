import { redirect } from "next/navigation";

// Los banners de campaña ahora se gestionan como una pestaña dentro de
// /admin/promociones (junto a las promociones, con las que comparten el
// carrusel de la Home). Se mantiene esta ruta para no romper enlaces ya
// guardados. dynamic = "force-dynamic" evita que Next.js sirva este
// redirect desde una caché estática sin la cabecera Location (mismo bug que
// en /promociones/[slug]).
export const dynamic = "force-dynamic";

export default function AdminCampanaRedirect() {
  redirect("/admin/promociones?tab=campana");
}
