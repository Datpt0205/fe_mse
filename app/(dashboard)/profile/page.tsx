import dynamicImport from "next/dynamic";

export const dynamic = "force-dynamic";

const ProfileClient = dynamicImport(() => import("./ProfileClient"), {
  ssr: false,
});

export default function ProfilePage() {
  return <ProfileClient />;
}
